{
  description = "HSA Helper - A simple app to help track HSA withdrawals";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    beads.url = "github:steveyegge/beads/v0.49.1";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, beads }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        # Select the Rust toolchain version
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Tauri dependencies for Linux only
        linuxDeps = with pkgs; pkgs.lib.optionals pkgs.stdenv.isLinux [
          # Build dependencies
          pkg-config
          openssl

          # Tauri runtime dependencies (Linux/GTK)
          gtk3
          webkitgtk_4_1
          libsoup_3
          glib
          gdk-pixbuf
          cairo
          pango
          atk
          librsvg

          # Additional Tauri requirements
          gst_all_1.gstreamer
          gst_all_1.gst-plugins-base
          gst_all_1.gst-plugins-good
          libappindicator-gtk3
        ];

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust toolchain
            rustToolchain

            # Node.js for TypeScript/React development
            nodejs_22

            # Git for version control
            git

            # LSP and formatter
            biome

            # Beads
            beads.packages.${system}.default
          ] ++ linuxDeps;

          # Environment variables needed for Tauri on Linux
          PKG_CONFIG_PATH = pkgs.lib.optionalString pkgs.stdenv.isLinux "${pkgs.openssl.dev}/lib/pkgconfig";

          shellHook = ''
            echo "Rust version: $(rustc --version)"
            echo "Node version: $(node --version)"
            echo ""
            echo "HSA Helper Development Environment"
            echo ""
          '';
        };

        packages = {
        };
      }
    );
}
