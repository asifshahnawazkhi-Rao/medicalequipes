export async function updateListing(
  session: AuthSession,
  listingId: string,
  values: Record<string, string>
) {
  requireUserSession(session);

  const user = session.user!;
  const columns = await tableColumns(session, "listings");
  const payload: Record<string, unknown> = {};

  setExisting(payload, columns, listingFields.category, values.categoryId);
  setExisting(payload, columns, listingFields.title, values.title?.trim());
  setExisting(payload, columns, listingFields.brand, values.brand?.trim());
  setExisting(payload, columns, listingFields.model, values.model?.trim());
  setExisting(payload, columns, listingFields.condition, values.condition);
  setExisting(payload, columns, listingFields.price, Number(values.price));
  setExisting(payload, columns, listingFields.city, values.city?.trim());
  setExisting(
    payload,
    columns,
    listingFields.description,
    values.description?.trim()
  );

  setExisting(
    payload,
    columns,
    listingFields.contactName,
    values.contactName?.trim()
  );

  setExisting(
    payload,
    columns,
    listingFields.contactEmail,
    values.contactEmail?.trim()
  );

  setExisting(
    payload,
    columns,
    listingFields.contactPhone,
    values.contactPhone?.trim()
  );

  await supabaseFetch(
    `/rest/v1/listings?id=eq.${encodeURIComponent(
      listingId
    )}&seller_id=eq.${encodeURIComponent(user.id)}`,
    session,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );
}
