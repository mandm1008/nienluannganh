'use client';

import { useEffect, useState } from 'react';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  Settings,
  LogOut,
  Home,
  X,
  Briefcase,
  Shield,
} from 'lucide-react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import Link from 'next/link';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.addEventListener('click', closeMenu);

    function closeMenu() {
      setMenuOpen(false);
    }

    return () => window.removeEventListener('click', closeMenu);
  }, []);

  function makeMenuOpen(e) {
    e.stopPropagation();
    setMenuOpen(true);
  }

  function makeMenuClose(e) {
    e.stopPropagation();
    setMenuOpen(false);
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-64'
        } transition-transform duration-300 ease-in-out z-50`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={makeMenuClose}
          className="text-white mb-4 block hover:cursor-pointer hover:bg-gray-700 p-2 rounded-lg"
        >
          <X size={24} />
        </button>
        <nav className="space-y-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 rounded-lg hover:cursor-pointer"
          >
            <Home size={20} /> Dashboard
          </Link>
          <Link
            href="/exam-rooms"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 rounded-lg hover:cursor-pointer"
          >
            <Briefcase size={20} /> Exam Room
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 rounded-lg hover:cursor-pointer"
          >
            <Shield size={20} /> Admin Site
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white shadow-md p-4 flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <button
              onClick={makeMenuOpen}
              className="p-2 rounded-lg hover:bg-gray-100 hover:cursor-pointer"
            >
              <Menu size={24} />
            </button>
            <span className="text-lg font-semibold text-white bg-blue-500 p-2 rounded-lg">
              ELSystem
            </span>
          </div>

          {/* Center - Language Selector */}
          <div className="hidden md:block text-gray-600">VIETNAMESE (VI)</div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Tippy content="Notifications" placement="bottom" theme="light">
              <button className="p-2 rounded-lg hover:bg-gray-100 hover:cursor-pointer">
                <Bell size={24} />
              </button>
            </Tippy>
            <Tippy
              content={
                <div className="w-48 bg-white rounded-lg p-2 font-semibold">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
                  >
                    <User size={16} /> Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
                  >
                    <Settings size={16} /> Settings
                  </Link>
                  <Link
                    href="/logout"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
                  >
                    <LogOut size={16} /> Logout
                  </Link>
                </div>
              }
              interactive={true}
              placement="bottom-end"
              theme="light"
              animation="scale"
            >
              <button className="flex items-center p-2 rounded-full border border-gray-300 hover:cursor-pointer">
                <User size={24} />
                <ChevronDown size={16} className="ml-2" />
              </button>
            </Tippy>
          </div>
        </header>
      </div>
    </div>
  );
}
