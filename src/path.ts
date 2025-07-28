import { err, ExhaustiveCaseError, ok, type Result } from "@coint/simple";
import {
  fileNameValidate,
  type FileNameValidateError,
  fileNameValidationErrorsToStrings,
} from "./filename.ts";

// OPT :: we will support only POSIX path for now
export enum PathType {
  Directory,
  File,
  SymbolicLink,
}

export abstract class AbstractPath {
  constructor(readonly name: string) {}

  abstract kind: PathType;
}

export class Directory extends AbstractPath {
  private constructor(name: string, readonly parent: Directory | undefined) {
    super(name);
  }

  readonly kind = PathType.Directory;

  get fullPath(): string {
    const parentFullPath = this.parent?.fullPath;
    if (parentFullPath === undefined) {
      // this is root
      return "/";
    }

    // OPT :: extract joiner
    const joiner = parentFullPath.endsWith("/") ? "" : "/";
    return parentFullPath + joiner + this.name;
  }

  directory(name: string): Result<Directory, FileNameValidateError[]> {
    const validatedName = fileNameValidate(name);
    if (!validatedName.success) {
      return err(validatedName.error);
    }

    return ok(new Directory(validatedName.value, this));
  }

  async exists(): Promise<Result<boolean, DirectoryExistsError>> {
    try {
      const stat = await Deno.stat(this.fullPath);
      if (stat.isDirectory) {
        return ok(true);
      } else {
        return err({ kind: "FILE_EXISTS" });
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return ok(false);
      }
      // Check if error message indicates path goes through a non-directory
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      if (errorMessage.includes("Not a directory")) {
        // This means a parent in the path is a file, not a directory
        return err({ kind: "FILE_EXISTS" });
      }
      return err({
        kind: "IO_ERROR",
        message: errorMessage,
      });
    }
  }

  async mkdir(): Promise<Result<boolean, MkdirError>> {
    try {
      await Deno.mkdir(this.fullPath);
      return ok(true);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        // Verify what type of entity already exists
        const existsResult = await this.exists();
        if (existsResult.success) {
          // Directory already exists
          if (existsResult.value) {
            return ok(false);
          } else {
            // Race condition: AlreadyExists error but directory doesn't exist now
            // This can happen in concurrent scenarios
            return err({
              kind: "IO_ERROR",
              message:
                `Filesystem reported AlreadyExists, but directory not found. Original error: ${error.message}`,
            });
          }
        } else {
          // Forward errors from exists() check
          switch (existsResult.error.kind) {
            case "FILE_EXISTS": {
              return err({ kind: "FILE_EXISTS" });
            }
            case "IO_ERROR": {
              return err(existsResult.error);
            }
            default: {
              throw new ExhaustiveCaseError(existsResult.error);
            }
          }
        }
      } else if (error instanceof Deno.errors.PermissionDenied) {
        return err({ kind: "PERMISSION_DENIED" });
      } else if (error instanceof Deno.errors.NotFound) {
        return err({ kind: "PARENT_NOT_FOUND" });
      } else {
        return err({
          kind: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async mkdirp(): Promise<Result<boolean, MkdirpError>> {
    if (this.parent) {
      const parentResult = await this.parent.mkdirp();
      if (!parentResult.success) {
        return err(parentResult.error);
      }
    }

    const mkdirResult = await this.mkdir();
    if (!mkdirResult.success) {
      switch (mkdirResult.error.kind) {
        case "FILE_EXISTS": {
          return err({ kind: "FILE_EXISTS" });
        }
        case "PERMISSION_DENIED": {
          return err({ kind: "PERMISSION_DENIED" });
        }
        case "PARENT_NOT_FOUND": {
          // This shouldn't happen since we created parents, but handle as IO_ERROR
          return err({
            kind: "IO_ERROR",
            message: `Unexpected PARENT_NOT_FOUND after creating parents`,
          });
        }
        case "IO_ERROR": {
          return err(mkdirResult.error);
        }
        default: {
          throw new ExhaustiveCaseError(mkdirResult.error);
        }
      }
    } else {
      return ok(mkdirResult.value);
    }
  }

  static build(path: string): Result<Directory, BuildDirectoryError> {
    if (!path.startsWith("/")) {
      return err({ kind: "NOT_ABSOLUTE_PATH", path });
    }

    // Handle root directory case
    if (path === "/") {
      return ok(new Directory("", undefined));
    }

    // Check for trailing slash
    if (path.endsWith("/")) {
      return err({ kind: "INVALID_TRAILING_SLASH", path });
    }

    const [_, ...children] = path.split("/");
    // TODO :: I can ensure _ is ''(empty string, but How can I force that?)
    type ReduceType = Result<Directory, BuildDirectoryPathSegmentError>;
    const reducer = (
      accumulator: ReduceType,
      pathSegement: string,
    ): ReduceType => {
      const name = fileNameValidate(pathSegement);
      if (!name.success) {
        const pathSegmentError: PathSegmentError = [pathSegement, name.error];
        if (!accumulator.success) {
          return err({
            kind: "INVALID_PATH_SEGMENT",
            pathSegmentErrors: [
              ...accumulator.error.pathSegmentErrors,
              pathSegmentError,
            ],
          });
        }
        return err({
          kind: "INVALID_PATH_SEGMENT",
          pathSegmentErrors: [pathSegmentError],
        });
      }

      if (!accumulator.success) {
        return accumulator;
      }

      return ok(new Directory(name.value, accumulator.value));
    };
    return children.reduce(reducer, ok(new Directory("", undefined)));
  }
}

type PathSegmentError = [string, FileNameValidateError[]];
type BuildDirectoryPathSegmentError = {
  kind: "INVALID_PATH_SEGMENT";
  pathSegmentErrors: PathSegmentError[];
};

type BuildDirectoryError =
  | { kind: "NOT_ABSOLUTE_PATH"; path: string }
  | { kind: "INVALID_TRAILING_SLASH"; path: string }
  | BuildDirectoryPathSegmentError;

type DirectoryExistsError = { kind: "FILE_EXISTS" } | {
  kind: "IO_ERROR";
  message: string;
};

type MkdirError =
  | { kind: "FILE_EXISTS" }
  | { kind: "PERMISSION_DENIED" }
  | { kind: "PARENT_NOT_FOUND" }
  | { kind: "IO_ERROR"; message: string };

type MkdirpError =
  | { kind: "FILE_EXISTS" }
  | { kind: "PERMISSION_DENIED" }
  | { kind: "IO_ERROR"; message: string };

export class File extends AbstractPath {
  readonly kind = PathType.File;
}

export type Path = Directory | File;

export function directoryExistsErrorToString(
  error: DirectoryExistsError,
): string {
  switch (error.kind) {
    case "FILE_EXISTS": {
      return "A file already exists at this path";
    }
    case "IO_ERROR": {
      return `I/O error: ${error.message}`;
    }
    default: {
      throw new ExhaustiveCaseError(error);
    }
  }
}

export function mkdirErrorToString(error: MkdirError): string {
  switch (error.kind) {
    case "FILE_EXISTS": {
      return "A file already exists at this path";
    }
    case "PERMISSION_DENIED": {
      return "Permission denied to create directory";
    }
    case "PARENT_NOT_FOUND": {
      return "Parent directory does not exist";
    }
    case "IO_ERROR": {
      return `I/O error: ${error.message}`;
    }
    default: {
      throw new ExhaustiveCaseError(error);
    }
  }
}

export function mkdirpErrorToString(error: MkdirpError): string {
  switch (error.kind) {
    case "FILE_EXISTS": {
      return "A file already exists in the path";
    }
    case "PERMISSION_DENIED": {
      return "Permission denied to create directory";
    }
    case "IO_ERROR": {
      return `I/O error: ${error.message}`;
    }
    default: {
      throw new ExhaustiveCaseError(error);
    }
  }
}

export function buildDirectoryErrorToString(
  error: BuildDirectoryError,
): string {
  switch (error.kind) {
    case "NOT_ABSOLUTE_PATH": {
      return `Path must be absolute: "${error.path}"`;
    }
    case "INVALID_TRAILING_SLASH": {
      return `Path cannot end with trailing slash: "${error.path}"`;
    }
    case "INVALID_PATH_SEGMENT": {
      const segments = error.pathSegmentErrors.map(([segment, errors]) => {
        const message = fileNameValidationErrorsToStrings(errors).join(", ");
        return `"${segment}": ${message}`;
      });
      return `Invalid path segments: ${segments.join("; ")}`;
    }
    default: {
      throw new ExhaustiveCaseError(error);
    }
  }
}
