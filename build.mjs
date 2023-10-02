import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  external: ["@react-email/render"],
  plugins: [
    dts({
      libraries: {
        inlinedLibraries: ["type-fest"],
      }
    }),
  ],
});
