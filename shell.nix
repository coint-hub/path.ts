{
  pkgs ? import <nixpkgs> { },
}:
let
  nixpkgs = import (fetchTarball {
    # unstable @ 2025.07.19 https://github.com/NixOS/nixpkgs/tree/6e987485eb2c77e5dcc5af4e3c70843711ef9251
    url = "https://github.com/NixOS/nixpkgs/tarball/6e987485eb2c77e5dcc5af4e3c70843711ef9251";
    sha256 = "1yj6j84a92848g2xv8q1pzn6c0b5ivarf01l0nii6r8f1rf1zb24";
  }) { };
  packages = with nixpkgs; [
    deno # 2.4.0
  ];
in
pkgs.mkShell {
  inherit packages;
}
