"use client";

import * as z from "zod";
import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import { Pencil, PlusCircle, Video } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Chapter, MuxData } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";

interface ChapterVideoFormProps {
  initialData: Chapter & { muxData?: MuxData | null };
  courseId: string;
  chapterId: string;
}

const formSchema = z.object({
  videoUrl: z.string().min(1),
});

export const ChapterVideoForm = ({
  initialData,
  courseId,
  chapterId,
}: ChapterVideoFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [playerInitTime, setPlayerInitTime] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState(initialData.videoUrl || "");

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (values.videoUrl) {
        // Ensure video URL is passed correctly
        const response = await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, {
          videoUrl: values.videoUrl, // Pass the video URL correctly
        });

        if (response.status === 200) {
          toast.success("Chapter updated");
          toggleEdit();
          // Refresh the page after the update
          window.location.assign(`/teacher/courses/${courseId}/chapters/${chapterId}`);
        } else {
          toast.error("Failed to update the chapter");
        }
      } else {
        toast.error("Invalid video URL");
      }
    } catch (error) {
      console.error("Error updating chapter video:", error);
      toast.error("Something went wrong");
    }
  };

  // Set player-init-time only on the client-side after component mounts
  useEffect(() => {
    setPlayerInitTime(Date.now());
  }, []);

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800 dark:text-slate-300">
      <div className="font-medium flex items-center justify-between">
        Chapter video
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && <>Cancel</>}
          {!isEditing && !initialData.videoUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add a video
            </>
          )}
          {!isEditing && initialData.videoUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit video
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        !initialData.videoUrl ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md dark:bg-gray-800 dark:text-slate-300">
            <Video className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            {playerInitTime && (
              <MuxPlayer
                playbackId={initialData?.muxData?.playbackId || ""}
                player-init-time={playerInitTime} // Set on client side
              />
            )}
          </div>
        )
      )}

{!isEditing && (
  !initialData?.videoUrl ? (
    <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md dark:bg-gray-800 dark:text-slate-300">
      <Video className="h-10 w-10 text-slate-500" />
    </div>
  ) : (
    <div className="relative aspect-video mt-2">
      {playerInitTime && initialData?.muxData?.playbackId ? (
        <MuxPlayer
          playbackId={initialData.muxData.playbackId}
          player-init-time={playerInitTime}
        />
      ) : (
        <div className="text-center text-sm text-red-500">
          Playback ID not found. Please check the upload status.
        </div>
      )}
    </div>
  )
)}

{isEditing && (
  <div>
    <FileUpload
      endpoint="chapterVideo"
      onChange={(url) => {
        if (url) {
          setVideoUrl(url); 
          onSubmit({ videoUrl: url });
        } else {
          toast.error("Failed to upload the video.");
        }
      }}
    />
    <div className="text-xs text-muted-foreground mt-4">
      Upload this chapter&apos;s video
    </div>
  </div>
)}

{initialData?.videoUrl && !isEditing && (
  <div className="text-xs text-muted-foreground mt-2">
    Videos can take a few minutes to process. Refresh the page if the video does not appear.
  </div>
)}
    </div>
  );
};
