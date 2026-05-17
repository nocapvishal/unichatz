"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/feed/PostCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface Post {
  _id: string;
  alias: string;
  avatarColor?: string;
  body: string;
  type: "text" | "poll" | "image";
  tags?: string[];
  dept?: string;
  likes: number;
  likedByMe: boolean;
  comments: number;
  bookmarked: boolean;
  images?: string[];
  poll?: { options: { label: string; votes: number }[]; totalVotes: number; expiresAt: string };
  createdAt: string;
  isPinned?: boolean;
  isHot?: boolean;
}

export interface PinnedPost {
  _id: string;
  title: string;
  alias: string;
  dept?: string;
}

export default function FeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const [feedType, setFeedType] = useState('hot');
  const [pinnedPost, setPinnedPost] = useState<PinnedPost | null>(null);

  const abortControllerRef = useRef(null);
  const observerTarget = useRef(null);

  useEffect(() => {
    async function loadPinned() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/feed/pinned`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data && data._id) {
            setPinnedPost(data);
          }
        }
      } catch (err) {
        console.error("Failed to load pinned post", err);
      }
    }
    loadPinned();
  }, []);

  const loadFeed = useCallback(async (currentPage: number, currentType: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/feed?type=${currentType}&page=${currentPage}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        if (currentPage === 1) {
          setPosts(data);
        } else {
          setPosts(prev => {
            // Deduplicate in case of race conditions
            const newPosts = data.filter((p: Post) => !prev.some(existing => existing._id === p._id));
            return [...prev, ...newPosts];
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Feed load error:', err);
      setError('Failed to load feed. Please check your connection.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [router]);

  useEffect(() => {
    loadFeed(page, feedType);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [page, feedType, loadFeed]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore]);

  const handleTabChange = (type: string) => {
    if (feedType !== type) {
      setFeedType(type);
      setPage(1);
      setHasMore(true);
      setPosts([]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullY(Math.min(diff * 0.4, 100)); // resistance
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullY > 80) {
      if (page === 1) {
        setPosts([]);
        loadFeed(1, feedType);
      } else {
        setHasMore(true);
        setPosts([]);
        setPage(1);
      }
    }
    setPullY(0);
  };

  return (
    <div 
      className="mx-auto max-w-2xl p-4 pt-6 min-h-screen bg-[#F7F5F0]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="flex justify-center items-end overflow-hidden transition-all duration-200"
        style={{ height: isPulling ? `${pullY}px` : '0px' }}
      >
        <span className="text-sm text-gray-500 font-medium pb-4">
          {pullY > 80 ? "Release to refresh..." : "↓ Pull to refresh"}
        </span>
      </div>

      <h1 className="mb-4 text-xl font-semibold text-[#2C2C2A]">
        Campus Feed
      </h1>

      <div className="mb-6 flex gap-4 border-b border-gray-200 pb-2 text-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange('hot')}
          className={`pb-2 whitespace-nowrap ${feedType === 'hot' ? 'text-[#2C2C2A] border-b-2 border-[#2C2C2A] font-medium' : 'text-[#888780] hover:text-[#2C2C2A]'}`}
        >
          Hot
        </button>

        <button
          onClick={() => handleTabChange('foryou')}
          className={`pb-2 whitespace-nowrap ${feedType === 'foryou' ? 'text-[#2C2C2A] border-b-2 border-[#2C2C2A] font-medium' : 'text-[#888780] hover:text-[#2C2C2A]'}`}
        >
          For you
        </button>

        <button
          onClick={() => handleTabChange('new')}
          className={`pb-2 whitespace-nowrap ${feedType === 'new' ? 'text-[#2C2C2A] border-b-2 border-[#2C2C2A] font-medium' : 'text-[#888780] hover:text-[#2C2C2A]'}`}
        >
          New
        </button>

        <button
          onClick={() => handleTabChange('top')}
          className={`pb-2 whitespace-nowrap ${feedType === 'top' ? 'text-[#2C2C2A] border-b-2 border-[#2C2C2A] font-medium' : 'text-[#888780] hover:text-[#2C2C2A]'}`}
        >
          Top
        </button>
      </div>

      {pinnedPost && (
        <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-3">
          <span className="text-xl mt-0.5">📌</span>
          <div>
            <h4 className="text-indigo-100 font-medium text-sm">{pinnedPost.title}</h4>
            <p className="text-indigo-300/80 text-[12px] mt-0.5">
              Pinned by {pinnedPost.alias} {pinnedPost.dept ? `· ${pinnedPost.dept}` : ''}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[16px] border border-black/5 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                  <div className="w-16 h-2 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="w-full h-3 bg-gray-200 rounded" />
                <div className="w-5/6 h-3 bg-gray-200 rounded" />
                <div className="w-4/6 h-3 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-4 bg-gray-200 rounded" />
                <div className="w-10 h-4 bg-gray-200 rounded" />
                <div className="w-10 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-12 flex flex-col items-center text-center p-8 bg-white rounded-xl border border-red-500/20">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 font-medium mb-6">{error}</p>
          <button 
            onClick={() => loadFeed(1, feedType)}
            className="bg-[#2C2C2A] hover:bg-black text-white px-6 py-2 rounded-full font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="text-5xl mb-4 opacity-80">📭</div>
          <h3 className="text-xl font-medium text-[#2C2C2A] mb-2">Nothing here yet</h3>
          <p className="text-[#888780] text-sm mb-6">Be the first to start a conversation!</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/match')}
              className="bg-[#2C2C2A] hover:bg-black text-white px-8 py-3 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">⚡</span> Find a Match
            </button>
            <button 
              onClick={() => router.push('/create')}
              className="text-[#888780] hover:text-[#2C2C2A] px-6 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Or be the first to post
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
          
          <div ref={observerTarget} className="h-4 w-full" />
          
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#2C2C2A] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              You're all caught up
            </div>
          )}
        </div>
      )}
    </div>
  );
}