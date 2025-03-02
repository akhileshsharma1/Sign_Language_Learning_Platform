"use client";

import { Category } from "@prisma/client";
import {
    FcGlobe,
    FcVoicePresentation,
    FcHome,
    FcReading,
    FcBinoculars
  } from "react-icons/fc";
import { IconType } from "react-icons";

import { CategoryItem } from "./category-item";

interface CategoriesProps {
  items: Category[];
}

const iconMap: Record<Category["name"], IconType> = {
    "Regional/National Sign Languages": FcGlobe,
    "International Sign Languages": FcVoicePresentation,
    "Village or Indigenous Sign Languages": FcHome,
    "Manually Coded Languages": FcReading,
    "Tactile Sign Languages": FcBinoculars,
  };

export const Categories = ({
  items,
}: CategoriesProps) => {
  return (
    <div className="flex items-center gap-x-2 overflow-x-auto pb-2">
      {items.map((item) => (
        <CategoryItem
          key={item.id}
          label={item.name}
          icon={iconMap[item.name]}
          value={item.id}
        />
      ))}
    </div>
  )
}