/** Minimal Maps JavaScript API surface for lazy-loaded confirmation UI. */
declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, opts?: MapOptions);
    getCenter(): LatLng | null | undefined;
    setCenter(latLng: LatLngLiteral): void;
    addListener(eventName: "idle", handler: () => void): MapsEventListener;
    addListener(eventName: "dragstart", handler: () => void): MapsEventListener;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    gestureHandling?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MapsEventListener {
    remove(): void;
  }
}

interface Window {
  google?: {
    maps: typeof google.maps;
  };
}
