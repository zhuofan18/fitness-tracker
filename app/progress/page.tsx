import { redirect } from "next/navigation";
import ProgressPhotoUpload from "@/components/ProgressPhotoUpload";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: photos } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  const paths = (photos ?? []).map((p) => p.photo_path);
  const { data: signedUrls } = paths.length
    ? await supabase.storage.from("progress-photos").createSignedUrls(paths, 3600)
    : { data: [] };

  const urlByPath = new Map(
    (signedUrls ?? []).map((s) => [s.path, s.signedUrl]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Progress photos</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          A visual timeline of physique change over your current bulk/cut and
          training split - muscle definition shows up slower than the scale
          does.
        </p>
      </div>

      <ProgressPhotoUpload />

      {(photos ?? []).length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No progress photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(photos ?? []).map((photo) => {
            const url = urlByPath.get(photo.photo_path);
            return (
              <div
                key={photo.id}
                className="flex flex-col gap-1 rounded border border-black/10 p-2 text-xs dark:border-white/10"
              >
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`Progress photo from ${photo.taken_at}`}
                    className="aspect-[3/4] w-full rounded object-cover"
                  />
                )}
                <p className="text-black/60 dark:text-white/60">
                  {new Date(photo.taken_at).toLocaleDateString()}
                  {photo.weight_kg ? ` · ${photo.weight_kg}kg` : ""}
                </p>
                {photo.notes && <p>{photo.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
