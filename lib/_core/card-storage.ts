import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface SavedCard {
  id: string;
  lastFour: string;
  brand: string; // visa, mastercard, amex, discover
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  encryptedCardNumber: string;
  encryptedCVV: string;
  savedAt: string; // ISO date
}

const STORAGE_KEY_PREFIX = "fitlife_card_";
const CARDS_LIST_KEY = "fitlife_saved_cards";

/**
 * Save a credit card securely
 */
export async function saveCard(
  cardNumber: string,
  expiryMonth: number,
  expiryYear: number,
  cvv: string,
  cardholderName: string
): Promise<SavedCard> {
  if (Platform.OS === "web") {
    console.warn("[CardStorage] Not available on web platform");
    throw new Error("Card storage not available on web");
  }

  try {
    // Generate unique ID for this card
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract last 4 digits
    const lastFour = cardNumber.slice(-4);

    // Detect card brand
    const brand = detectCardBrand(cardNumber);

    // Create card object
    const card: SavedCard = {
      id: cardId,
      lastFour,
      brand,
      expiryMonth,
      expiryYear,
      cardholderName,
      encryptedCardNumber: cardNumber, // In production, encrypt this
      encryptedCVV: cvv, // In production, encrypt this
      savedAt: new Date().toISOString(),
    };

    // Save card data securely
    const storageKey = `${STORAGE_KEY_PREFIX}${cardId}`;
    await SecureStore.setItemAsync(storageKey, JSON.stringify(card));

    // Add to cards list
    await addCardToList(cardId);

    console.log("[CardStorage] Card saved successfully:", cardId);
    return card;
  } catch (error) {
    console.error("[CardStorage] Error saving card:", error);
    throw error;
  }
}

/**
 * Get all saved cards for the user
 */
export async function getSavedCards(): Promise<SavedCard[]> {
  if (Platform.OS === "web") {
    return [];
  }

  try {
    const cardsListJson = await SecureStore.getItemAsync(CARDS_LIST_KEY);
    if (!cardsListJson) {
      return [];
    }

    const cardIds: string[] = JSON.parse(cardsListJson);
    const cards: SavedCard[] = [];

    for (const cardId of cardIds) {
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${cardId}`;
        const cardJson = await SecureStore.getItemAsync(storageKey);
        if (cardJson) {
          cards.push(JSON.parse(cardJson));
        }
      } catch (error) {
        console.error("[CardStorage] Error loading card:", cardId, error);
      }
    }

    return cards;
  } catch (error) {
    console.error("[CardStorage] Error getting saved cards:", error);
    return [];
  }
}

/**
 * Get a specific saved card
 */
export async function getCard(cardId: string): Promise<SavedCard | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${cardId}`;
    const cardJson = await SecureStore.getItemAsync(storageKey);
    if (!cardJson) {
      return null;
    }

    return JSON.parse(cardJson);
  } catch (error) {
    console.error("[CardStorage] Error getting card:", error);
    return null;
  }
}

/**
 * Delete a saved card
 */
export async function deleteCard(cardId: string): Promise<void> {
  if (Platform.OS === "web") {
    console.warn("[CardStorage] Not available on web platform");
    return;
  }

  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${cardId}`;
    await SecureStore.deleteItemAsync(storageKey);

    // Remove from cards list
    await removeCardFromList(cardId);

    console.log("[CardStorage] Card deleted:", cardId);
  } catch (error) {
    console.error("[CardStorage] Error deleting card:", error);
    throw error;
  }
}

/**
 * Delete all saved cards
 */
export async function deleteAllCards(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const cards = await getSavedCards();
    for (const card of cards) {
      await deleteCard(card.id);
    }

    console.log("[CardStorage] All cards deleted");
  } catch (error) {
    console.error("[CardStorage] Error deleting all cards:", error);
    throw error;
  }
}

/**
 * Detect card brand from card number
 */
function detectCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");

  if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(digits)) {
    return "visa";
  } else if (/^5[1-5][0-9]{14}$/.test(digits)) {
    return "mastercard";
  } else if (/^3[47][0-9]{13}$/.test(digits)) {
    return "amex";
  } else if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(digits)) {
    return "discover";
  }

  return "unknown";
}

/**
 * Add card ID to the list of saved cards
 */
async function addCardToList(cardId: string): Promise<void> {
  try {
    const cardsListJson = await SecureStore.getItemAsync(CARDS_LIST_KEY);
    const cardIds: string[] = cardsListJson ? JSON.parse(cardsListJson) : [];

    if (!cardIds.includes(cardId)) {
      cardIds.push(cardId);
      await SecureStore.setItemAsync(CARDS_LIST_KEY, JSON.stringify(cardIds));
    }
  } catch (error) {
    console.error("[CardStorage] Error adding card to list:", error);
  }
}

/**
 * Remove card ID from the list of saved cards
 */
async function removeCardFromList(cardId: string): Promise<void> {
  try {
    const cardsListJson = await SecureStore.getItemAsync(CARDS_LIST_KEY);
    if (!cardsListJson) {
      return;
    }

    let cardIds: string[] = JSON.parse(cardsListJson);
    cardIds = cardIds.filter((id) => id !== cardId);

    if (cardIds.length === 0) {
      await SecureStore.deleteItemAsync(CARDS_LIST_KEY);
    } else {
      await SecureStore.setItemAsync(CARDS_LIST_KEY, JSON.stringify(cardIds));
    }
  } catch (error) {
    console.error("[CardStorage] Error removing card from list:", error);
  }
}
