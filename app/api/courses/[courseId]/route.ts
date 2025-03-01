import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    {params}: {params: { courseId: string }}
) {
    try {
        const { userId } = await auth();
        const { courseId } = params;
        const values = await req.json();

        if (!userId) {
            console.error("Unauthorized access attempt");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.update({
            where: {
                id: courseId,
                userId
            },
            data: {
                ...values
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.error("[COURSE_ID] Error updating course:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
