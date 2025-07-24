import { Result, ok } from "./result.ts";
import { fileNameValidate, FileNameValidateError } from "./filename.ts";

// we will support only POSIX path for now
export enum PathType {
  Directory,
  File,
  SymbolicLink,
}

export abstract class AbstractPath {
  abstract kind: PathType;

  name: string;

  constructor(name: string) {
    this.name = name;
  }

  static file(name: string): Result<File, FileNameValidateError[]> {
    const result = fileNameValidate(name);
    if (!result.success) {
      return result;
    }
    return ok(new File(result.value));
  }

  static directory(name: string): Result<Directory, FileNameValidateError[]> {
    const result = fileNameValidate(name);
    if (!result.success) {
      return result;
    }
    return ok(new Directory(result.value));
  }

  static symbolickLink(
    name: string,
  ): Result<SymbolicLink, FileNameValidateError[]> {
    const result = fileNameValidate(name);
    if (!result.success) {
      return result;
    }
    return ok(new SymbolicLink(result.value));
  }
}

export class Directory extends AbstractPath {
  readonly kind = PathType.Directory;
}

export class File extends AbstractPath {
  readonly kind = PathType.File;
}

export class SymbolicLink extends AbstractPath {
  readonly kind = PathType.SymbolicLink;
}

export type Path = Directory | File | SymbolicLink;
