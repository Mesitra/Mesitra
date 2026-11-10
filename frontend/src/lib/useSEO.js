import { useEffect } from 'react'

/**
 * Hook sederhana untuk mengelola judul halaman dan meta tag SEO secara dinamis di sisi klien.
 * Memastikan setiap route memiliki document.title dan meta description yang relevan dengan kata kunci.
 */
export function useSEO({ title, description, keywords }) {
  useEffect(() => {
    if (title) {
      document.title = title
    }

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = description

      // Update juga og:description jika ada
      const ogDesc = document.querySelector('meta[property="og:description"]')
      if (ogDesc) {
        ogDesc.content = description
      }
    }

    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]')
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta')
        metaKeywords.name = 'keywords'
        document.head.appendChild(metaKeywords)
      }
      metaKeywords.content = keywords
    }
  }, [title, description, keywords])
}

