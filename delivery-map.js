/* ============================================================
   KRINT TUFWALE — delivery-map.js
   Optional delivery pin for checkout (cart.html).

   - "Use my current location": the browser's own geolocation.
     Free, no key, works anywhere HTTPS does.
   - "Choose on map" + place search: Google Maps. Shown only when
     GOOGLE_MAPS_API_KEY is set in config.js. Google's script loads
     when the customer clicks, not when the page opens, so ordinary
     cart visits never count as a (billable) map load.

   The pin is optional: the typed address is still required.
   ============================================================ */
(() => {
    const $ = (id) => document.getElementById(id);

    const useBtn = $("useMyLocation");
    if (!useBtn) return;   // not the checkout page

    const mapBtn = $("chooseOnMap");
    const clearBtn = $("clearPin");
    const panel = $("locationMap");
    const searchBox = $("locationSearch");
    const canvas = $("locationMapCanvas");
    const confirmBtn = $("confirmPin");
    const statusEl = $("locationStatus");
    const addressEl = $("checkoutAddress");

    const MAPS_KEY = (typeof GOOGLE_MAPS_API_KEY !== "undefined" && GOOGLE_MAPS_API_KEY) || "";
    const LUSAKA = { lat: -15.3875, lng: 28.3228 };

    let pin = null;          // { lat, lng } once shared or chosen
    let map = null;
    let mapsReady = null;    // one shared promise, so Google's script loads once

    const round6 = (n) => Math.round(n * 1e6) / 1e6;
    const mapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

    // Messages go in as text nodes, never as HTML
    function setStatus(message, { error = false, link = false } = {}) {
        statusEl.textContent = "";
        statusEl.classList.toggle("is-error", error);
        statusEl.hidden = !message;
        if (!message) return;

        statusEl.append(message);

        if (link && pin) {
            const a = document.createElement("a");
            a.href = mapsUrl(pin);
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = "Check it on Google Maps";
            statusEl.append(" ", a);
        }
    }

    function setPin(point, message) {
        pin = { lat: round6(point.lat), lng: round6(point.lng) };
        clearBtn.hidden = false;
        if (MAPS_KEY) mapBtn.textContent = "Adjust on map";
        setStatus(message, { link: true });
    }

    function clearPin() {
        pin = null;
        clearBtn.hidden = true;
        if (MAPS_KEY) mapBtn.textContent = "Choose on map";
        setStatus("");
    }

    /* ---------- 1. the device's own location ---------- */

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            setStatus("Your browser can't share its location. Please type your address instead.", { error: true });
            return;
        }

        useBtn.disabled = true;
        setStatus("Finding your location...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                useBtn.disabled = false;

                const { latitude, longitude, accuracy } = position.coords;
                const metres = Math.round(accuracy || 0);

                // A laptop on wifi can be off by kilometres, so say so
                const message = metres > 500
                    ? `Location shared, but it is rough (about ${metres} m). ${MAPS_KEY ? "Please adjust it on the map, or make" : "Please make"} sure your typed address is clear. `
                    : `Location shared (accurate to about ${metres} m). `;

                setPin({ lat: latitude, lng: longitude }, message);

                if (map && !panel.hidden) {
                    map.setCenter(pin);
                    map.setZoom(17);
                }
            },
            (error) => {
                useBtn.disabled = false;

                const reasons = {
                    1: "Location permission was blocked. You can allow it in your browser settings, or just type your address.",
                    2: "Your device couldn't work out where you are. Please type your address instead.",
                    3: "Finding your location took too long. Please try again, or type your address.",
                };
                setStatus(reasons[error.code] || reasons[2], { error: true });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    /* ---------- 2. Google Maps (only when a key is configured) ---------- */

    function loadGoogleMaps() {
        if (mapsReady) return mapsReady;

        mapsReady = new Promise((resolve, reject) => {
            window.__ktMapsReady = resolve;

            // Google calls this when it rejects the key (wrong referrer, billing off...)
            window.gm_authFailure = () => {
                setStatus("Google Maps rejected this site's key. You can still share your location or type your address.", { error: true });
            };

            const script = document.createElement("script");
            script.src = "https://maps.googleapis.com/maps/api/js"
                + `?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&callback=__ktMapsReady`;
            script.async = true;
            script.onerror = () => {
                mapsReady = null;   // allow another try
                reject(new Error("Google Maps could not load."));
            };
            document.head.appendChild(script);
        });

        return mapsReady;
    }

    async function openMapPanel() {
        mapBtn.disabled = true;

        try {
            await loadGoogleMaps();

            const { Map: GoogleMap } = await google.maps.importLibrary("maps");
            const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

            panel.hidden = false;   // it needs a size before the map is created

            if (!map) {
                map = new GoogleMap(canvas, {
                    center: pin || LUSAKA,
                    zoom: pin ? 17 : 13,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: "greedy",
                    clickableIcons: false,
                });

                const search = new PlaceAutocompleteElement();
                searchBox.appendChild(search);

                search.addEventListener("gmp-select", async ({ placePrediction }) => {
                    try {
                        const place = placePrediction.toPlace();

                        // Only address + coordinates: Place Details is billed by the fields you ask for
                        await place.fetchFields({ fields: ["formattedAddress", "location"] });

                        map.setCenter(place.location);
                        map.setZoom(17);

                        if (addressEl && !addressEl.value.trim() && place.formattedAddress) {
                            addressEl.value = place.formattedAddress.slice(0, 300);
                        }
                    } catch (err) {
                        setStatus("Couldn't open that place. Try moving the map instead.", { error: true });
                    }
                });
            } else if (pin) {
                map.setCenter(pin);
                map.setZoom(17);
            }
        } catch (err) {
            setStatus("The map couldn't load. You can still share your location or type your address.", { error: true });
        } finally {
            mapBtn.disabled = false;
        }
    }

    // The pin is fixed in the middle of the map; the customer moves the map under it
    function confirmPin() {
        if (!map) return;
        const centre = map.getCenter();
        setPin({ lat: centre.lat(), lng: centre.lng() }, "Delivery pin set. ");
        panel.hidden = true;
    }

    /* ---------- wiring ---------- */

    useBtn.addEventListener("click", useCurrentLocation);
    clearBtn.addEventListener("click", clearPin);

    if (MAPS_KEY) {
        mapBtn.hidden = false;
        mapBtn.addEventListener("click", openMapPanel);
        confirmBtn.addEventListener("click", confirmPin);
    }

    // script.js reads this when the order is placed
    window.KTDelivery = {
        getPin: () => (pin ? { lat: pin.lat, lng: pin.lng } : null),
        clear: clearPin,
    };
})();