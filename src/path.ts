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

export class File extends AbstractPath {
  readonly kind = PathType.File;
}

export type Path = Directory | File;
