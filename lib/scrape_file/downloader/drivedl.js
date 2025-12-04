// downloader/drivedl.js
const axios = require('axios');

const API_KEY = 'AIzaSyAA9ERw-9LZVEohRYtCWka_TQc6oXmvcVU'; // ganti kalau perlu

function extractFileId(driveUrl) {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // .../file/d/ID/view
    /id=([a-zA-Z0-9_-]+)/,              // ?id=ID
    /folders\/([a-zA-Z0-9_-]+)/,        // .../folders/ID
    /^([a-zA-Z0-9_-]+)$/                // langsung ID
  ];

  for (const pattern of patterns) {
    const match = String(driveUrl).match(pattern);
    if (match) return match[1];
  }
  return null;
}

module.exports = async function drivedl(url) {
  try {
    if (!url) {
      throw new Error('URL is required.');
    }

    const fileId = extractFileId(url);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL or ID.');
    }

    // ambil metadata file / folder
    const { data: metadata } = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        params: {
          key: API_KEY,
          fields: 'id,name,mimeType,size,webContentLink,owners,createdTime'
        }
      }
    );

    const isFolder = metadata.mimeType === 'application/vnd.google-apps.folder';

    if (isFolder) {
      // list isi folder
      const { data: list } = await axios.get(
        'https://www.googleapis.com/drive/v3/files',
        {
          params: {
            key: API_KEY,
            q: `'${fileId}'+in+parents`,
            fields: 'files(id,name,mimeType,size,owners,createdTime)'
          }
        }
      );

      const files = list.files || [];

      return {
        type: 'folder',
        details: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          createdTime: metadata.createdTime,
          totalFiles: files.length,
          owner: metadata.owners && metadata.owners[0]
            ? {
                name: metadata.owners[0].displayName,
                email: metadata.owners[0].emailAddress,
                photoLink: metadata.owners[0].photoLink
              }
            : null
        },
        contents: files
          .filter(file => !file.mimeType.includes('application/vnd.google-apps.folder'))
          .map(file => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : 'N/A',
            createdTime: file.createdTime,
            downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`
          }))
      };
    } else {
      // single file biasa
      return {
        type: 'file',
        details: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size
            ? `${(metadata.size / 1024 / 1024).toFixed(2)} MB`
            : 'N/A',
          createdTime: metadata.createdTime,
          owner: metadata.owners && metadata.owners[0]
            ? {
                name: metadata.owners[0].displayName,
                email: metadata.owners[0].emailAddress,
                photoLink: metadata.owners[0].photoLink
              }
            : null
        },
        downloadUrl: `https://www.googleapis.com/drive/v3/files/${metadata.id}?alt=media&key=${API_KEY}`,
        directDownload: metadata.webContentLink || null
      };
    }
  } catch (error) {
    // bikin pesan error lebih jelas, termasuk dari Google API
    if (error.response) {
      throw new Error(
        `Google API ${error.response.status}: ${
          typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data)
        }`
      );
    }
    throw new Error(error.message || String(error));
  }
};