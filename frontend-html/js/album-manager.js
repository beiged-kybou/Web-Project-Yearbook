
/**
 * Album Manager for Static HTML Version
 * Uses localStorage to simulate backend persistence
 */

const STORAGE_KEY = 'yearbook_albums';

// Initialize with some default mock data if empty
function initAlbums() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const defaultAlbums = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAlbums));
    }
}

function getAlbums() {
    initAlbums();
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function getAlbumById(id) {
    const albums = getAlbums();
    return albums.find(a => a.id === id);
}

function saveAlbum(albumData) {
    const albums = getAlbums();
    const newAlbum = {
        id: Date.now().toString(),
        title: albumData.title,
        description: albumData.description,
        type: 'Personal',
        coverColor: getRandomColor(),
        photoCount: albumData.photos ? albumData.photos.length : 0,
        photos: albumData.photos || [], // Array of { name, date, description, color }
        createdAt: new Date().toLocaleDateString()
    };

    albums.push(newAlbum);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    return newAlbum;
}

function getRandomColor() {
    const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#e2e8f0', '#f1f5f9', '#FECACA', '#BFDBFE', '#BBF7D0'];
    return colors[Math.floor(Math.random() * colors.length)];
}

window.AlbumManager = {
    getAlbums,
    getAlbumById,
    saveAlbum,
    getRandomColor
};
