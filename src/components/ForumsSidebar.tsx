import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useForumCategories, useForumPosts } from '@/hooks/useForums';
import { MessageSquare, Hash } from 'lucide-react';

export const ForumsSidebar = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { data: categories = [] } = useForumCategories();
  const { data: allPosts = [] } = useForumPosts();

  const getCategoryPostCount = (catId: string) => {
    return allPosts.filter(post => post.category_id === catId).length;
  };

  const getTotalPosts = () => {
    return allPosts.length;
  };

  return (
    <div className="w-64 border-r bg-muted/10 h-full">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Forum Categories</h2>
        </div>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {/* All Categories */}
            <Button
              variant={!categoryId ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate('/forums')}
            >
              <Hash className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">All Categories</span>
              <Badge variant="outline" className="text-xs">
                {getTotalPosts()}
              </Badge>
            </Button>
            
            <Separator className="my-2" />
            
            {/* Individual Categories */}
            {categories.map((category) => {
              const postCount = getCategoryPostCount(category.id);
              const isActive = categoryId === category.id;
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-between text-left p-3"
                  onClick={() => navigate(`/forums/${category.id}`)}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="mr-2 flex-shrink-0">{category.icon}</span>
                    <span className="truncate">{category.name}</span>
                  </div>
                  <Badge 
                    variant={isActive ? "default" : "outline"} 
                    className="text-xs flex-shrink-0"
                  >
                    {postCount}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};