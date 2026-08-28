"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getStoredSession } from "../../../auth";

import {
  deleteListingImage,
  getListingById,
  getListingImagesForEdit,
  reorderListingImages,
  saveListingImages,
  updateListing,
  uploadListingImage,
  type EditableListingImage,
} from "../../../supabaseData";

const maxFiles = 8;
const maxFileSize = 5 * 1024 * 1024;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type ListingDetail = {
  id: string;
  title: string;
  category: string;
  price: number;
  city: string;
  condition: string;
  description: string;
  brand: string;
  model: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  images: string[];
  sellerId: string;
};

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [listingId, setListingId] = useState("");

  const [listing, setListing] =
    useState<ListingDetail | null>(null);

  const [existingImages, setExistingImages] =
    useState<EditableListingImage[]>([]);

  const [newFiles, setNewFiles] =
    useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => setListingId(id));
  }, [params]);

  useEffect(() => {
    if (!listingId) return;

    const stored = getStoredSession();

    if (!stored?.access_token) {
      window.location.replace("/");
      return;
    }

    const session = stored;

    async function loadListing() {
      try {
        const data = await getListingById(
          listingId,
          session
        );

        if (!data) {
          setListing(null);
          return;
        }

        if (
          data.sellerId &&
          data.sellerId !== session.user?.id
        ) {
          setError(
            "You can only edit your own listings."
          );
          setListing(null);
          return;
        }

        setListing(data);

        const images =
          await getListingImagesForEdit(
            session,
            listingId
          );

        setExistingImages(images);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load listing."
        );
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [listingId]);

  function chooseNewImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files
        ? Array.from(event.target.files)
        : [];

    if (!selected.length) return;

    setError("");
    setMessage("");

    const invalid = selected.find(
      (file) =>
        !allowedTypes.includes(file.type) ||
        file.size > maxFileSize
    );

    if (invalid) {
      event.target.value = "";

      setError(
        `${invalid.name} must be a JPG, PNG, or WebP image up to 5 MB.`
      );

      return;
    }

    const availableSlots =
      maxFiles -
      existingImages.length -
      newFiles.length;

    if (availableSlots <= 0) {
      event.target.value = "";

      setError(
        `Maximum ${maxFiles} images are allowed.`
      );

      return;
    }

    const accepted =
      selected.slice(0, availableSlots);

    setNewFiles((current) => [
      ...current,
      ...accepted,
    ]);

    if (selected.length > availableSlots) {
      setMessage(
        `Only ${availableSlots} additional image(s) were added because the maximum is ${maxFiles}.`
      );
    }

    event.target.value = "";
  }

  function removeNewImage(index: number) {
    setNewFiles((current) =>
      current.filter((_, i) => i !== index)
    );
  }
async function moveExistingImage(
  index: number,
  direction: "left" | "right"
) {
  const targetIndex =
    direction === "left" ? index - 1 : index + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= existingImages.length
  ) {
    return;
  }

  const session = getStoredSession();

  if (!session?.access_token || !listingId) {
    window.location.replace("/");
    return;
  }

  const reordered = [...existingImages];

  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];

  // Update UI immediately.
  setExistingImages(reordered);
  setError("");
  setMessage("Saving photo order...");

  try {
    await reorderListingImages(
      session,
      listingId,
      reordered
    );

    setExistingImages(
      reordered.map((image, imageIndex) => ({
        ...image,
        sortOrder: imageIndex,
      }))
    );

    setMessage("Photo order updated.");
  } catch (err) {
    // Restore previous order if saving fails.
    setExistingImages(existingImages);
    setMessage("");

    setError(
      err instanceof Error
        ? err.message
        : "Could not update photo order."
    );
  }
}
  async function removeExistingImage(
    image: EditableListingImage
  ) {
    if (
      existingImages.length +
        newFiles.length <=
      1
    ) {
      setError(
        "A listing must have at least one equipment image."
      );
      return;
    }

    const confirmed = window.confirm(
      "Remove this image from the listing?"
    );

    if (!confirmed) return;

    const session = getStoredSession();

    if (
      !session?.access_token ||
      !listingId
    ) {
      window.location.replace("/");
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteListingImage(
        session,
        listingId,
        image.id,
        image.imageUrl
      );

      setExistingImages((current) =>
        current.filter(
          (item) => item.id !== image.id
        )
      );

      setMessage("Image removed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove image."
      );
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const session = getStoredSession();

    if (
      !session?.access_token ||
      !listingId
    ) {
      window.location.replace("/");
      return;
    }

    if (
      existingImages.length +
        newFiles.length <
      1
    ) {
      setError(
        "Please keep or upload at least one equipment image."
      );
      return;
    }

    const form =
      new FormData(event.currentTarget);

    const values =
      Object.fromEntries(
        form.entries()
      ) as Record<string, string>;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      setMessage(
        "Saving listing details..."
      );

      await updateListing(
        session,
        listingId,
        values
      );

      if (newFiles.length > 0) {
        const uploaded = [];

        for (
          let index = 0;
          index < newFiles.length;
          index++
        ) {
          setMessage(
            `Uploading image ${
              index + 1
            } of ${newFiles.length}...`
          );

          const uploadedImage =
            await uploadListingImage(
              session,
              listingId,
              newFiles[index]
            );

          uploaded.push(uploadedImage);
        }

        const highestSortOrder =
          existingImages.reduce(
            (highest, image) =>
              Math.max(
                highest,
                image.sortOrder
              ),
            -1
          );

        await saveListingImages(
          session,
          listingId,
          uploaded,
          highestSortOrder + 1
        );
      }

      setMessage(
        "Listing updated successfully."
      );

      window.setTimeout(() => {
        window.location.assign(
          `/listing/${listingId}`
        );
      }, 900);
    } catch (err) {
      setMessage("");

      setError(
        err instanceof Error
          ? err.message
          : "Could not update listing."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">
          Loading listing...
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">
          <h1>Listing not found</h1>

          {error && (
            <p>{error}</p>
          )}

          <a href="/dashboard">
            ← Back to dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="sellPage">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brandMark">
              +
            </span>

            <span>
              Medical
              <span>Equipes</span>
            </span>
          </a>

          <nav>
            <a href="/dashboard">
              Dashboard
            </a>

            <a
              href={`/listing/${listing.id}`}
            >
              View Listing
            </a>
          </nav>
        </div>
      </header>

      <section className="sellHero">
        <div className="container">
          <span className="eyebrow">
            SELLER DASHBOARD
          </span>

          <h1>Edit equipment listing</h1>

          <p>
            Update equipment details,
            seller contact information and
            listing photos.
          </p>
        </div>
      </section>

      <section className="container sellFormWrap">
        <form
          className="sellForm"
          onSubmit={submit}
        >
          <div className="formSection">
            <h2>Equipment details</h2>

            <div className="formGrid">
              <label>
                Equipment title *
                <input
                  name="title"
                  required
                  defaultValue={
                    listing.title
                  }
                />
              </label>

              <label>
                Category
                <input
                  value={
                    listing.category
                  }
                  disabled
                  readOnly
                />
              </label>

              <label>
                Brand
                <input
                  name="brand"
                  defaultValue={
                    listing.brand
                  }
                />
              </label>

              <label>
                Model
                <input
                  name="model"
                  defaultValue={
                    listing.model
                  }
                />
              </label>

              <label>
                Condition *
                <select
                  name="condition"
                  required
                  defaultValue={
                    listing.condition
                  }
                >
                  <option value="New">
                    New
                  </option>

                  <option value="Like New">
                    Like New
                  </option>

                  <option value="Used">
                    Used
                  </option>

                  <option value="Refurbished">
                    Refurbished
                  </option>

                  <option value="Demo">
                    Demo
                  </option>
                </select>
              </label>

              <label>
                Price (PKR) *
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={
                    listing.price
                  }
                />
              </label>

              <label>
                Location / city *
                <input
                  name="city"
                  required
                  defaultValue={
                    listing.city
                  }
                />
              </label>

              <label>
                Contact name
                <input
                  name="contactName"
                  defaultValue={
                    listing.contactName
                  }
                />
              </label>

              <label>
                Contact email
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={
                    listing.contactEmail
                  }
                />
              </label>

              <label>
                Contact phone
                <input
                  name="contactPhone"
                  defaultValue={
                    listing.contactPhone
                  }
                />
              </label>
            </div>

            <label>
              Description *
              <textarea
                name="description"
                required
                rows={7}
                defaultValue={
                  listing.description
                }
              />
            </label>
          </div>

          <div className="formSection">
            <h2>Equipment photos</h2>

            <p className="helpText">
              Keep, remove or add photos.
              Maximum {maxFiles} images.
              JPG, PNG or WebP. Maximum
              5 MB each.
            </p>

            {existingImages.length > 0 && (
              <>
                <h3>Current photos</h3>

<div className="editImageGrid">
  {existingImages.map((image, index) => (
    <div
      className="editImageCard"
      key={image.id}
    >
      <div className="editImagePreview">
        <img
          src={image.imageUrl}
          alt={`${listing.title} image ${index + 1}`}
        />

        {index === 0 && (
          <span className="primaryImageBadge">
            Primary
          </span>
        )}

        <span className="imagePositionBadge">
          #{index + 1}
        </span>
      </div>

      <div className="editImageMoveActions">
        <button
          type="button"
          onClick={() =>
            moveExistingImage(index, "left")
          }
          disabled={saving || index === 0}
          title="Move image left"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() =>
            moveExistingImage(index, "right")
          }
          disabled={
            saving ||
            index === existingImages.length - 1
          }
          title="Move image right"
        >
          →
        </button>
      </div>

      <button
        className="editImageRemove"
        type="button"
        onClick={() =>
          removeExistingImage(image)
        }
        disabled={saving}
      >
        Remove
      </button>
    </div>
  ))}
</div>
              </>
            )}

            {newFiles.length > 0 && (
              <>
                <h3>New photos</h3>

                <div className="editNewImageList">
                  {newFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                      >
                        <span>
                          {file.name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeNewImage(
                              index
                            )
                          }
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            )}

            {existingImages.length +
              newFiles.length <
              maxFiles && (
              <input
                className="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={
                  chooseNewImages
                }
                disabled={saving}
              />
            )}

            <p className="helpText">
              {existingImages.length +
                newFiles.length}{" "}
              of {maxFiles} images selected.
            </p>
          </div>

          {message && (
            <div
              className="authMessage"
              role="status"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              className="formError"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="primary submitListing"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving changes..."
              : "Save Changes"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              window.location.assign(
                "/dashboard"
              )
            }
          >
            Cancel
          </button>
        </form>
      </section>
    </main>
  );
}
