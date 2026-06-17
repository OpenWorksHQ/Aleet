import React from 'react'
import { TextLink } from './ui'

export default function Footer() {
    return (
        <footer className="flex items-center justify-between px-6 py-5 text-xs text-muted sm:px-10">
            <div className="flex gap-5">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    Instagram
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    TikTok
                </a>
            </div>
            <div className="flex gap-5">
                <TextLink href="/about" className="text-xs text-muted hover:text-gold">About</TextLink>
                <TextLink href="/privacy" className="text-xs text-muted hover:text-gold">Privacy Policy</TextLink>
                <TextLink href="/terms" className="text-xs text-muted hover:text-gold">Terms of Service</TextLink>
            </div>
        </footer>
    )
}
