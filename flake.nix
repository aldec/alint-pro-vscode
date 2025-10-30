{
  description = "VSCode extention for integration with ALINT-PRO";

  inputs = {
    flakelight.url = "github:nix-community/flakelight";
    # nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = inputs:
    inputs.flakelight ./flake.nix {
      apps = {
        test = pkgs: "${pkgs.buildFHSEnv {
          name = "test-extension";

          targetPkgs = pkgs:
            with pkgs; [
              alsa-lib
              at-spi2-atk
              cairo
              dbus.lib
              expat
              glib
              gtk3
              libgbm
              libudev-zero
              libxkbcommon
              nodejs
              nspr
              nss
              pango
              pnpm
              xorg.libX11
              xorg.libXcomposite
              xorg.libXdamage
              xorg.libXext
              xorg.libXfixes
              xorg.libXrandr
              xorg.libxcb
            ];

          runScript = "${pkgs.writeShellScript "run-tests" ''
            pnpm run test
          ''}";
        }}/bin/test-extension";
      };

      devShells = {
        default.packages = pkgs:
          with pkgs; [
            just
            nodejs
            pnpm
            vscodium
          ];
      };
    };
}
