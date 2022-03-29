{
  description = "discord bot that manages user tags";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    crate2nix = {
      url = "github:kolloch/crate2nix";
      flake = false;
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, utils, rust-overlay, crate2nix, flake-compat }:
    let
      name = "tagbot";
      NYI = builtins.throw "This feature is NYI";
    in utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            rust-overlay.overlay
            (self: super: {
              rustc = self.rust-bin.stable.latest.default;
              cargo = self.rust-bin.stable.latest.default;
            })
          ];
        };

        # runtime dependencies
        buildInputs = with pkgs; [
        ];

        # build time dependencies
        nativeBuildInputs = with pkgs; [
          cargo
          docker
          lldb
          nixpkgs-fmt
          pkgconfig
          rustc
        ];

        buildEnvVars = {
        };
      in rec {
        # `$ nix build`
        defaultPackage = packages.${name} = NYI;

        # `$ nix run`
        defaultApp = apps.${name} = NYI;

        # `$ nix develop`
        devShell = pkgs.mkShell {
          inherit buildInputs nativeBuildInputs;
          RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
        } // buildEnvVars;
      }
    )
  ;
}

