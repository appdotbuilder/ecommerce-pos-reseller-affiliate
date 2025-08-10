import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { SafeUser, CreateUserInput, LoginInput, LoginResponse, UserRole, SeedUser } from '../../server/src/schema';

function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Users list state
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SafeUser[]>([]);
  const [filter, setFilter] = useState<{
    role: UserRole | 'all';
    search: string;
    is_active: boolean | 'all';
  }>({
    role: 'all',
    search: '',
    is_active: 'all'
  });
  
  // Demo credentials state
  const [demoUsers, setDemoUsers] = useState<SeedUser[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Form states
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });
  
  const [newUserData, setNewUserData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  // Load demo users credentials for reference
  const loadDemoUsers = useCallback(async () => {
    try {
      const demo = await trpc.getDemoUsers.query();
      setDemoUsers(demo);
    } catch (error) {
      console.error('Failed to load demo users:', error);
    }
  }, []);

  // Load users list
  const loadUsers = useCallback(async () => {
    try {
      const usersList = await trpc.getUsers.query();
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  // Seed demo users
  const seedDemoUsers = async () => {
    setIsLoading(true);
    try {
      await trpc.seedDemoUsers.mutate();
      await loadUsers();
      setMessage({ type: 'success', text: 'Demo users seeded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to seed demo users' });
    } finally {
      setIsLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response: LoginResponse = await trpc.login.mutate(loginData);
      if (response.success && response.user) {
        setCurrentUser(response.user);
        setIsLoggedIn(true);
        setMessage({ type: 'success', text: 'Logged in successfully!' });
        setLoginData({ email: '', password: '' });
      } else {
        setMessage({ type: 'error', text: response.message || 'Login failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  // Create user handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      await trpc.createUser.mutate(newUserData);
      await loadUsers();
      setMessage({ type: 'success', text: 'User created successfully!' });
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create user' });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setMessage({ type: 'success', text: 'Logged out successfully' });
  };

  // Filter users
  useEffect(() => {
    let filtered = users;
    
    if (filter.role !== 'all') {
      filtered = filtered.filter((user: SafeUser) => user.role === filter.role);
    }
    
    if (filter.is_active !== 'all') {
      filtered = filtered.filter((user: SafeUser) => user.is_active === filter.is_active);
    }
    
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter((user: SafeUser) => 
        user.username.toLowerCase().includes(search) || 
        user.email.toLowerCase().includes(search)
      );
    }
    
    setFilteredUsers(filtered);
  }, [users, filter]);

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadDemoUsers();
  }, [loadUsers, loadDemoUsers]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'reseller': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 User Management System</h1>
            <p className="text-gray-600">Manage users with role-based access control</p>
          </div>
          
          {isLoggedIn && currentUser && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-gray-900">{currentUser.username}</p>
                <Badge variant={getRoleBadgeVariant(currentUser.role)}>{currentUser.role}</Badge>
              </div>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={isLoggedIn ? "users" : "login"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="login" disabled={isLoggedIn}>🔑 Login</TabsTrigger>
            <TabsTrigger value="users">👤 Users</TabsTrigger>
            <TabsTrigger value="create" disabled={!isLoggedIn || currentUser?.role !== 'admin'}>➕ Create User</TabsTrigger>
            <TabsTrigger value="demo">🎭 Demo</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>🔐 Login to System</CardTitle>
                <CardDescription>
                  Enter your credentials to access the user management system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
                
                {/* Demo credentials hint */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-semibold mb-2">💡 Demo Credentials:</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>Admin:</strong> admin@demo.com / admin123</p>
                    <p><strong>Reseller:</strong> reseller@demo.com / reseller123</p>
                    <p><strong>User:</strong> user@demo.com / user123</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users List Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>👥 Users Directory</CardTitle>
                <CardDescription>
                  View and manage all system users
                </CardDescription>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Label>Role:</Label>
                    <Select 
                      value={filter.role} 
                      onValueChange={(value: UserRole | 'all') => 
                        setFilter((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="reseller">Reseller</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label>Status:</Label>
                    <Select 
                      value={filter.is_active === 'all' ? 'all' : filter.is_active ? 'active' : 'inactive'} 
                      onValueChange={(value: string) => 
                        setFilter((prev) => ({ 
                          ...prev, 
                          is_active: value === 'all' ? 'all' : value === 'active' 
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 min-w-48">
                    <Label>Search:</Label>
                    <Input
                      placeholder="Search by username or email..."
                      value={filter.search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setFilter((prev) => ({ ...prev, search: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">🤷‍♂️ No users found</p>
                    <p className="text-sm">Try adjusting your filters or create some users</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map((user: SafeUser) => (
                      <Card key={user.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{user.username}</h3>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? '✅ Active' : '❌ Inactive'}
                            </span>
                            <span>
                              Joined {user.created_at.toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create User Tab */}
          <TabsContent value="create">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>➕ Create New User</CardTitle>
                <CardDescription>
                  Add a new user to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isLoggedIn || currentUser?.role !== 'admin' ? (
                  <Alert>
                    <AlertDescription>
                      🔒 Admin access required to create users
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUserData.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewUserData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                        }
                        required
                        placeholder="Enter username"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewUserData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        required
                        placeholder="Enter email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewUserData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                        }
                        required
                        placeholder="Enter password"
                        minLength={6}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select 
                        value={newUserData.role} 
                        onValueChange={(value: UserRole) => 
                          setNewUserData((prev: CreateUserInput) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">👤 User</SelectItem>
                          <SelectItem value="reseller">🏪 Reseller</SelectItem>
                          <SelectItem value="admin">👑 Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Tab */}
          <TabsContent value="demo">
            <Card>
              <CardHeader>
                <CardTitle>🎭 Demo Data Management</CardTitle>
                <CardDescription>
                  Seed the system with demo users for testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div>
                    <h3 className="font-semibold text-yellow-800">🌱 Seed Demo Users</h3>
                    <p className="text-sm text-yellow-700">
                      Add sample users for each role to test the system
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isLoading}>
                        Seed Users
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Seed Demo Users?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create demo users for testing. Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={seedDemoUsers}>
                          Seed Users
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">🔑 Demo User Credentials</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {demoUsers.map((demoUser: SeedUser) => (
                      <Card key={demoUser.email} className="border-2 border-dashed">
                        <CardContent className="p-4">
                          <div className="text-center space-y-2">
                            <Badge variant={getRoleBadgeVariant(demoUser.role)} className="mb-2">
                              {demoUser.role.toUpperCase()}
                            </Badge>
                            <h4 className="font-semibold">{demoUser.username}</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Email:</strong> {demoUser.email}</p>
                              <p><strong>Password:</strong> {demoUser.password}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    💡 <strong>Note:</strong> These are demo credentials for development and testing. 
                    In a production environment, use secure, unique passwords and proper authentication.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;