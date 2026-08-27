useEffect(() => {
  const stored = getStoredSession();

  if (!stored?.access_token) {
    window.location.replace("/");
    return;
  }

  const session = stored;

  async function loadFavorites() {
    try {
      const favoriteIds =
        await getFavoriteListingIds(session);

      const allListings =
        await getPublicListings(session);

      const favoriteListings =
        allListings.filter((listing) =>
          favoriteIds.includes(listing.id)
        );

      setListings(favoriteListings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load favorites."
      );
    } finally {
      setLoading(false);
    }
  }

  loadFavorites();
}, []);
