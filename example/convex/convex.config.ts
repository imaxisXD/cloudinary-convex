import { defineApp } from "convex/server";
import cloudinary from "../../src/component/convex.config.js";

const app = defineApp();
app.use(cloudinary);

export default app;
