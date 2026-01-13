/**
 * Códigos de secciones de inicio definidos en el backend
 * Estos códigos deben coincidir con los del endpoint /api/HomeSection
 * 
 * Endpoint: https://cms.differentroads.es/api/HomeSection
 */
export enum HomeSectionCode {
  BANNER = 'BANNER',
  TOUR_CARROUSEL = 'TOUR_CARROUSEL',
  TOUR_GRID = 'TOUR_GRID',
  FULLSCREEN_CARDS = 'FULLSCREEN_CARDS',
  MIXED_SECTION = 'MIXED_SECTION',
  TRAVELER_SECTION = 'TRAVELER_SECTION',
  REVIEWS_SECTION = 'REVIEWS_SECTION',
  FEATURED_SECTION = 'FEATURED_SECTION',
  ARTICLES_SECTION = 'ARTICLES_SECTION',
  PARTNERS_CARROUSEL = 'PARTNERS_CARROUSEL',
  ABOUT_US = 'ABOUT_US'
}

/**
 * IDs de secciones (mapeo estático basado en el backend)
 * Estos IDs son estables y no cambian
 */
export enum HomeSectionId {
  BANNER = 1,
  TOUR_CARROUSEL = 2,
  TOUR_GRID = 3,
  FULLSCREEN_CARDS = 4,
  MIXED_SECTION = 5,
  TRAVELER_SECTION = 6,
  REVIEWS_SECTION = 7,
  FEATURED_SECTION = 8,
  ARTICLES_SECTION = 9,
  PARTNERS_CARROUSEL = 10,
  ABOUT_US = 11
}

/**
 * Mapeo de ID de sección a código
 */
export const HOME_SECTION_ID_TO_CODE: Record<HomeSectionId, HomeSectionCode> = {
  [HomeSectionId.BANNER]: HomeSectionCode.BANNER,
  [HomeSectionId.TOUR_CARROUSEL]: HomeSectionCode.TOUR_CARROUSEL,
  [HomeSectionId.TOUR_GRID]: HomeSectionCode.TOUR_GRID,
  [HomeSectionId.FULLSCREEN_CARDS]: HomeSectionCode.FULLSCREEN_CARDS,
  [HomeSectionId.MIXED_SECTION]: HomeSectionCode.MIXED_SECTION,
  [HomeSectionId.TRAVELER_SECTION]: HomeSectionCode.TRAVELER_SECTION,
  [HomeSectionId.REVIEWS_SECTION]: HomeSectionCode.REVIEWS_SECTION,
  [HomeSectionId.FEATURED_SECTION]: HomeSectionCode.FEATURED_SECTION,
  [HomeSectionId.ARTICLES_SECTION]: HomeSectionCode.ARTICLES_SECTION,
  [HomeSectionId.PARTNERS_CARROUSEL]: HomeSectionCode.PARTNERS_CARROUSEL,
  [HomeSectionId.ABOUT_US]: HomeSectionCode.ABOUT_US,
};

/**
 * Mapeo de código a ID de sección (inverso)
 */
export const HOME_SECTION_CODE_TO_ID: Record<HomeSectionCode, HomeSectionId> = {
  [HomeSectionCode.BANNER]: HomeSectionId.BANNER,
  [HomeSectionCode.TOUR_CARROUSEL]: HomeSectionId.TOUR_CARROUSEL,
  [HomeSectionCode.TOUR_GRID]: HomeSectionId.TOUR_GRID,
  [HomeSectionCode.FULLSCREEN_CARDS]: HomeSectionId.FULLSCREEN_CARDS,
  [HomeSectionCode.MIXED_SECTION]: HomeSectionId.MIXED_SECTION,
  [HomeSectionCode.TRAVELER_SECTION]: HomeSectionId.TRAVELER_SECTION,
  [HomeSectionCode.REVIEWS_SECTION]: HomeSectionId.REVIEWS_SECTION,
  [HomeSectionCode.FEATURED_SECTION]: HomeSectionId.FEATURED_SECTION,
  [HomeSectionCode.ARTICLES_SECTION]: HomeSectionId.ARTICLES_SECTION,
  [HomeSectionCode.PARTNERS_CARROUSEL]: HomeSectionId.PARTNERS_CARROUSEL,
  [HomeSectionCode.ABOUT_US]: HomeSectionId.ABOUT_US,
};
