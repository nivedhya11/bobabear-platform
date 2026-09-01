/**
 * Required Google Maps attribution for Places Autocomplete (New)
 * results displayed without a map.
 *
 * Authority: https://developers.google.com/maps/documentation/places/web-service/policies
 * Text attribution is permitted when space is limited; do not localize or wrap
 * the words "Google Maps".
 */
export function GoogleMapsAttribution() {
  return (
    <p
      className="font-body text-[12px] text-[#5e5e5e]"
      translate="no"
      data-testid="google-maps-attribution"
    >
      Google Maps
    </p>
  );
}
