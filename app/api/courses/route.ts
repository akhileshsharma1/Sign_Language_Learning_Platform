import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
) {
    try {
        // Get the auth session
        const session = await auth();
        
        // Log the entire session for debugging
        console.log("Auth session:", JSON.stringify(session, null, 2));
        
        // Check if we have a userId
        if (!session || !session.userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { title } = await req.json();
        
        if (!title) {
            return new NextResponse("Title is required", { status: 400 });
        }

        const course = await db.course.create({
            data: {
                userId: session.userId,
                title
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.error("[COURSES]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}