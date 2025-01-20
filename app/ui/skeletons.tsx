import {Spinner} from "@heroui/react";

export function CardsSkeleton() {
  return (
    <div className="inline-block text-center justify-center">
      <Spinner />
    </div>
  );
}