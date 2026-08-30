/**
 * Fail-closed Delivery provider (IMP-031).
 *
 * Default when callers omit `options.provider`. Tests must inject the fake.
 */

import { DeliveryError } from "../../../shared/delivery";
import type {
  DeliveryProvider,
  DeliveryProviderCancelBookingInput,
  DeliveryProviderCreateBookingInput,
  DeliveryProviderQueryBookingInput,
} from "./types";

export const disabledDeliveryProvider: DeliveryProvider = Object.freeze({
  name: "disabled",

  async createBooking(
    _input: DeliveryProviderCreateBookingInput,
  ): Promise<never> {
    throw new DeliveryError(
      "DELIVERY_PROVIDER_UNAVAILABLE",
      "Delivery provider is disabled; inject a test or configured provider.",
    );
  },

  async queryBooking(
    _input: DeliveryProviderQueryBookingInput,
  ): Promise<never> {
    throw new DeliveryError(
      "DELIVERY_PROVIDER_UNAVAILABLE",
      "Delivery provider is disabled; inject a test or configured provider.",
    );
  },

  async cancelBooking(
    _input: DeliveryProviderCancelBookingInput,
  ): Promise<never> {
    throw new DeliveryError(
      "DELIVERY_PROVIDER_UNAVAILABLE",
      "Delivery provider is disabled; inject a test or configured provider.",
    );
  },
});
