import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle, Clock, InfoIcon } from "lucide-react";

import { getDashboardCourses } from "@/actions/get-dashboard-courses";
import { CoursesList } from "@/components/courses-list";

import { InfoCard } from "./_components/info-card";
import { BannerCard } from "./_components/banner-card";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const {
    completedCourses,
    coursesInProgress
  } = await getDashboardCourses(userId);

  const uniqueCourses = new Map();
  [...coursesInProgress, ...completedCourses].forEach(course => {
    uniqueCourses.set(course.id, {
      ...course,
      chapter: course.chapter || [],
    });
  });

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <BannerCard
          icon={InfoIcon}
          label="Welcome to the dashboard"
          description={`This is where you can track your progress and continue learning sign language. Our platform is designed to provide accessible and interactive sign language courses for everyone. All courses are free, and you can start learning without any payment. If you need assistance or have any questions, feel free to reach out to us`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard
          icon={Clock}
          label="In Progress"
          numberOfItems={coursesInProgress.length}
        />
        <InfoCard
          icon={CheckCircle}
          label="Completed"
          numberOfItems={completedCourses.length}
          variant="success"
        />
      </div>
      <CoursesList
        items={Array.from(uniqueCourses.values())}
      />
    </div>
  );
}
