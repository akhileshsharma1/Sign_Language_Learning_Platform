import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export async function POST(
    req: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const user = await currentUser();   

        if (!user || !user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
              id: params.courseId,
              isPublished: true,
            },
            include: {
              chapter: {
                where: {
                  isPublished: true,
                },
                orderBy: {
                  position: "asc", // Ensure chapters are ordered
                },
              },
            },
          });

        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: params.courseId,
                },
            },
        });

        if (purchase) {
            return new NextResponse("Already Purchased", { status: 400 });
        }

        if (!course) {
            return new NextResponse("Not Found", { status: 404 });
        }   

        // define line items for stripe check out page.
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: course.title,
                    },
                    unit_amount: Math.round(course.price! * 100),
                },
                quantity: 1,
            },
        ];

        let stripeCustomer = await db.stripeCustomer.findUnique({
            where: {
                userId: user.id,
            },
            select: {
                stripeCustomerId: true,
            },
        });

        if (!stripeCustomer) {
            const customer = await stripe.customers.create({
                email: user.emailAddresses?.[0]?.emailAddress,
            });

            stripeCustomer = await db.stripeCustomer.create({
                data: {
                    userId: user.id,
                    stripeCustomerId: customer.id,
                },
            });
        }
        const firstChapter = course.chapter?.[0];

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomer.stripeCustomerId,
            line_items: lineItems,
            mode: "payment",
            success_url: firstChapter
        ? `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}/chapters/${firstChapter.id}?success=1`
        : `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?canceled=1`,
            metadata: {
                courseId: course.id,
                userId: user.id,
            },
        });

        return NextResponse.json({ url: session.url });
        
    } catch (error) {
        console.log("COURSE_ID_CHECKOUT", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}