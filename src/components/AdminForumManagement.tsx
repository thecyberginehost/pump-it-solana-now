import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Pin, PinOff, Lock, Unlock, Trash2, Search, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  user_wallet: string;
  category_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

interface ForumReply {
  id: string;
  content: string;
  user_wallet: string;
  post_id: string;
  created_at: string;
}

export const AdminForumManagement = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchReplies();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_pinned: !isPinned })
        .eq('id', postId);

      if (error) throw error;

      toast.success(`Post ${!isPinned ? 'pinned' : 'unpinned'} successfully`);
      fetchPosts();
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast.error(error.message || 'Failed to update post');
    }
  };

  const handleToggleLock = async (postId: string, isLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_locked: !isLocked })
        .eq('id', postId);

      if (error) throw error;

      toast.success(`Post ${!isLocked ? 'locked' : 'unlocked'} successfully`);
      fetchPosts();
    } catch (error: any) {
      console.error('Error toggling lock:', error);
      toast.error(error.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete replies first
      await supabase
        .from('forum_replies')
        .delete()
        .eq('post_id', postId);

      // Then delete the post
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(error.message || 'Failed to delete post');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forum_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      toast.success('Reply deleted successfully');
      fetchReplies();
    } catch (error: any) {
      console.error('Error deleting reply:', error);
      toast.error(error.message || 'Failed to delete reply');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.user_wallet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPostReplies = (postId: string) => {
    return replies.filter(reply => reply.post_id === postId);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading forum data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Pin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {posts.filter(p => p.is_pinned).length}
                </p>
                <p className="text-sm text-muted-foreground">Pinned Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {posts.filter(p => p.is_locked).length}
                </p>
                <p className="text-sm text-muted-foreground">Locked Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{replies.length}</p>
                <p className="text-sm text-muted-foreground">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Forum Posts ({filteredPosts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {post.content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatWalletAddress(post.user_wallet)}
                  </TableCell>
                  <TableCell>{post.reply_count}</TableCell>
                  <TableCell>{post.view_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {post.is_pinned && <Badge variant="default">Pinned</Badge>}
                      {post.is_locked && <Badge variant="destructive">Locked</Badge>}
                      {!post.is_pinned && !post.is_locked && (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(post.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPost(post);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={post.is_pinned ? "default" : "outline"}
                        onClick={() => handleTogglePin(post.id, post.is_pinned)}
                      >
                        {post.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant={post.is_locked ? "default" : "outline"}
                        onClick={() => handleToggleLock(post.id, post.is_locked)}
                      >
                        {post.is_locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Post Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold">{selectedPost.title}</h3>
                <p className="text-sm text-muted-foreground">
                  By {formatWalletAddress(selectedPost.user_wallet)} on {formatDate(selectedPost.created_at)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Content</label>
                <div className="mt-1 p-3 border rounded-md bg-muted/20">
                  <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Replies ({getPostReplies(selectedPost.id).length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getPostReplies(selectedPost.id).map((reply) => (
                    <div key={reply.id} className="p-3 border rounded-md bg-muted/10">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium">
                          {formatWalletAddress(reply.user_wallet)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at)}
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReply(reply.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};