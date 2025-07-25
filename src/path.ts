import { err, ok, type Result } from "@coint/simple";
import { fileNameValidate, type FileNameValidateError } from "./filename.ts";

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
      return err({
        kind: "IO_ERROR",
        message: error instanceof Error ? error.message : String(error),
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

export class File extends AbstractPath {
  readonly kind = PathType.File;
}

export type Path = Directory | File;
