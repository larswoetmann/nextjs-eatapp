import {Spinner} from "@nextui-org/react";

export function CardsSkeleton() {
  return (
    <div className="inline-block text-center justify-center">
      <Spinner />
    </div>
  );
}