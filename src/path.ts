import { Result } from "@result/result";
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
    return fileNameValidate(name).map((name) => new File(name));
  }

  static directory(name: string): Result<Directory, FileNameValidateError[]> {
    return fileNameValidate(name).map((name) => new Directory(name));
  }

  static symbolickLink(
    name: string,
  ): Result<SymbolicLink, FileNameValidateError[]> {
    return fileNameValidate(name).map((name) => new SymbolicLink(name));
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
