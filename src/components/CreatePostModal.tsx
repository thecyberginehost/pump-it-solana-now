import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForumCategories, useCreateForumPost, useCanPostInCategory } from '@/hooks/useForums';
import { Plus } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  categoryId,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [postType, setPostType] = useState('discussion');

  const { data: categories = [] } = useForumCategories();
  const createPost = useCreateForumPost();
  const { data: canPostInSelected = true } = useCanPostInCategory(selectedCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !selectedCategoryId) {
      return;
    }

    try {
      await createPost.mutateAsync({
        category_id: selectedCategoryId,
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
      });

      // Reset form
      setTitle('');
      setContent('');
      setSelectedCategoryId('');
      setPostType('discussion');
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedCategoryId(categoryId || '');
    setPostType('discussion');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const postTypeOptions = [
    { value: 'discussion', label: 'General Discussion', description: 'General conversation or topic' },
    { value: 'question', label: 'Question', description: 'Ask for help or advice' },
    { value: 'bug_report', label: 'Bug Report', description: 'Report a technical issue' },
    { value: 'feature_request', label: 'Feature Request', description: 'Suggest a new feature' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                      {category.admin_only_posting && (
                        <Badge variant="outline" className="text-xs">Admin Only</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="postType">Post Type</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent>
                {postTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter your post title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <div className="text-xs text-muted-foreground text-right">
              {title.length}/200 characters
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your post content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={5000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/5000 characters
            </div>
          </div>

          {/* Permission Warning */}
          {selectedCategoryId && !canPostInSelected && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                You do not have permission to post in this category. Only administrators can create posts here.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!title.trim() || !content.trim() || !selectedCategoryId || createPost.isPending || !canPostInSelected}
            >
              {createPost.isPending ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};