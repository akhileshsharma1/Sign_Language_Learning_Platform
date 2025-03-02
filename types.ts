import { Category, Course } from "@prisma/client";

export type CourseWithProgressWithCategory = Course & {
    category: Category | null;
    chapter: { id: string }[];
    progress: number | null;
};

// export type SafeProfile = Omit<
//   Profile,
//   "createdAt" | "updatedAt" 
// > & {
//   createdAt: string;
//   updatedAt: string;
// };