"use client";

import { UserButton,useAuth } from "@clerk/nextjs"
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { SearchInput } from "./search-input";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { isTeacher } from "@/lib/teacher";

export const NavbarRoutes = () => {
    const pathname = usePathname();
    // const router = useRouter();
    const { userId } = useAuth();

    const isTeacherPage = pathname?.startsWith("/teacher");
    const isPlayerPage = pathname?.includes("/courses");
    const isSearchPage = pathname === "/search";

    return (
        <>
        {
            isSearchPage && (
                <div className="hidden md:block">
                    <SearchInput />
                </div>
            )
        }
        <div className="flex gap-x ml-auto">
            {isTeacherPage || isPlayerPage ? (
                <Link href="/">
                <Button size="sm" variant="ghost">
                    <LogOut className="h-4 w-4 mr-2"/>
                    Exit
                </Button>
                </Link>
            ) : isTeacher(userId) ? (
                <Link href="/teacher/courses">
                    <Button size="sm" variant="ghost">
                        Teacher mode
                    </Button>
                </Link>
            ) : null}
            <UserButton 
                afterSignOutUrl="/"
            />
        </div>
        </>
    )
}