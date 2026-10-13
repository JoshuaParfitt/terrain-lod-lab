# Terrain LOD Lab

An interactive WebGL terrain viewer demonstrating **custom distance-based level-of-detail selection**. Made with Three.js and Vite.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the production build: `npm run build`.

## What is implemented

- A deterministic mathematical height function generates continuous terrain across 49 tiles.
- Each tile has three precomputed mesh resolutions: 48x48, 16x16, and 4x4 segments.
- A custom policy chooses a tile resolution based on the camera-to-tile-center distance (thresholds: 42 and 91 units).
- The interface reports total **selected terrain triangles**, a full-resolution baseline, approximate FPS, and tile counts by resolution.
- Manual baseline and low-resolution modes demonstrate the geometry trade-off.

## Engineering trade-offs / limitations

- The geometry for all three resolutions is precomputed and held in memory, trading higher memory use for inexpensive runtime switching.
- Switching can cause visible popping and cracks at tile edges; a production solution could use geomorphing and stitched borders/skirts.
- No terrain-level frustum culling is included in the displayed geometry count, so counts describe *selected* triangles, not necessarily triangles sent to the GPU.
- Approximate FPS is a browser-dependent observation, not a rigorous benchmark or GPU-timing metric. Reduced triangle count does not guarantee proportional FPS gains.
- Camera distance to tile center is a simple heuristic; projected screen-space error would be better for production.

## Deployment

Push this folder to a GitHub repository and import the repo into Vercel or Cloudflare Pages. Framework preset: **Vite**, build command: `npm run build`, output directory: `dist`.
