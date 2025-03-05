// app/api/uploadthing/core.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Auth handler
const handleAuth = async () => {
    const session = await auth();
    if (!session || !session.userId) throw new Error("Unauthorized");
    return { userId: session.userId };
}

export const ourFileRouter = {
    profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => await handleAuth())
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Profile image upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            return { url: file.url, name: file.name };
        }),
    courseImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => await handleAuth())
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Course image upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            return { url: file.url, name: file.name };
        }),
    courseAttachment: f(["text", "image", "video", "audio", "pdf"])
        .middleware(async () => await handleAuth())
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Course attachment upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            return { url: file.url, name: file.name };
        }),
    chapterVideo: f({ video: { maxFileCount: 1, maxFileSize: "512GB" } })
        .middleware(async () => await handleAuth())
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Chapter video upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            return { url: file.url, name: file.name };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;