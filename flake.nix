{
  description = "HSA Helper - A simple app to help track HSA withdrawals";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    beads.url = "github:steveyegge/beads";
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

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust toolchain
            rustToolchain

            # Deno for TypeScript/React development
            deno

            # Node.js ecosystem (useful for npm packages and tooling)
            nodejs_22

            # Git for version control
            git

            # LSP and formatter
            biome

            # Beads
            beads.packages.${system}.default
          ];

          shellHook = ''
            echo "🦀 Rust version: $(rustc --version)"
            echo "🦕 Deno version: $(deno --version | head -n1)"
            echo "📦 Node version: $(node --version)"
            echo ""
            echo "HSA Helper Development Environment"
            echo ""
          '';
        };

        # Optional: define packages
        packages = {
          # You can add package definitions here as your project grows
        };
      }
    );
}
