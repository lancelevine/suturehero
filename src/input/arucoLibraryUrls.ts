/** Resolve assets in an ES module; classic workers cannot evaluate import.meta in development. */
export const ARUCO_LIBRARY_URLS={
    cv:new URL('./arucoLibraries/cv.js',import.meta.url).href,
    aruco:new URL('./arucoLibraries/aruco.js',import.meta.url).href,
};
