import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  fileUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 3 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    video: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", (metadata as any)?.userId);
      console.log("file url", file.url);
      return { uploadedBy: (metadata as any)?.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

