import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Calendar,
  Clock,
  Copy,
  Globe,
  Key,
  Network,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Separator } from "../ui/separator";

type AccessLevel = "view" | "view-download";

type AccessCondition = {
  allowedIps?: string[];
  expiryDate?: string;
  expiryTime?: string;
  password?: string;
};

type Collaborator = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  accessLevel: AccessLevel;
};

export function ShareOptions() {
  const [accessLevel, setAccessLevel] = useLocalStorage<AccessLevel>(
    "share-access-level",
    "view"
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState(
    "https://example.com/document/abc123"
  );
  const [emailInput, setEmailInput] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [allowedIps, setAllowedIps] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("public");

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: "1",
      name: "Alex Johnson",
      email: "alex@example.com",
      avatarUrl: "",
      accessLevel: "view-download",
    },
    {
      id: "2",
      name: "Sam Rivera",
      email: "sam@example.com",
      avatarUrl: "",
      accessLevel: "view",
    },
  ]);

  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    // You could add a toast notification here
  };

  const handleAddCollaborator = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) return;

    const newCollaborator: Collaborator = {
      id: Date.now().toString(),
      name: emailInput.split("@")[0],
      email: emailInput,
      avatarUrl: "",
      accessLevel: accessLevel,
    };

    setCollaborators([...collaborators, newCollaborator]);
    setEmailInput("");
  };

  const removeCollaborator = (id: string) => {
    setCollaborators(collaborators.filter((c) => c.id !== id));
  };

  const updateCollaboratorAccess = (id: string, newAccess: AccessLevel) => {
    setCollaborators(
      collaborators.map((c) =>
        c.id === id ? { ...c, accessLevel: newAccess } : c
      )
    );
  };

  const getAccessLevelLabel = (level: AccessLevel) => {
    return level === "view" ? "Can view" : "Can view & download";
  };

  return (
    <ResponsiveDialog
      trigger={
        <Button
          className="group shadow-none rounded-md text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
        >
          <Share2 className="size-4 group-hover:scale-105 transition-transform" />
          <span className="sr-only">Share</span>
        </Button>
      }
      title="Share"
      description="Control who can access this document"
      open={shareDialogOpen}
      onOpenChange={setShareDialogOpen}
      // showCancel={true}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 bg-primary-foreground border-b border-primary/10"
      bodyClassName="pb-6 md:pb-8 gap-8"
    >
      <Tabs
        defaultValue="public"
        className="w-full gap-8"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 rounded-none h-auto px-6 md:px-8 py-2">
          <TabsTrigger value="public">Public</TabsTrigger>
          <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
        </TabsList>

        {/* Public Tab - Link Sharing */}
        <TabsContent value="public" className="px-6 md:px-8 space-y-6">
          <div className="flex items-center gap-2">
            <Input value={shareLink} readOnly className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {getAccessLevelLabel(accessLevel)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={accessLevel}
                  onValueChange={(value) =>
                    setAccessLevel(value as AccessLevel)
                  }
                >
                  <DropdownMenuRadioItem value="view">
                    Can view
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="view-download">
                    Can view & download
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleCopyLink}>
              <Copy className="w-4 h-4" />
              <span className="sr-only">Copy Link</span>
            </Button>
          </div>

          <Separator />
          {/* label for advance filters */}
          <Label className="text-sm font-medium">Advanced Options</Label>

          {/* Password Protection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Key className="size-4 text-muted-foreground" />
                <Label className="text-xs font-medium">
                  Password Protection
                </Label>
              </div>
              <Switch
                checked={passwordEnabled}
                onCheckedChange={setPasswordEnabled}
              />
            </div>
            {passwordEnabled && (
              <div className="ml-8">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
          </div>

          {/* Expiry Date and Time */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="size-4 text-muted-foreground" />
                <Label className="text-xs font-medium">
                  Expiry Date and Time
                </Label>
              </div>
              <Switch
                checked={expiryEnabled}
                onCheckedChange={setExpiryEnabled}
              />
            </div>
            {expiryEnabled && (
              <div className="grid grid-cols-2 gap-2 ml-8">
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="text-sm"
                />

                <Input
                  type="time"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
          </div>

          {/* IP Restriction */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Network className="size-4 text-muted-foreground" />
                <Label className="text-xs font-medium">IP Restriction</Label>
              </div>
              <Switch
                checked={ipRestrictionEnabled}
                onCheckedChange={setIpRestrictionEnabled}
              />
            </div>
            {ipRestrictionEnabled && (
              <div className="ml-8">
                <Input
                  placeholder="Enter IP addresses (comma separated)"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: 192.168.1.1, 10.0.0.1
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Collaborators Tab */}
        <TabsContent value="collaborators" className="px-6 md:px-8 space-y-8">
          {/* Add People Section */}
          <div className="flex items-center gap-2">
            <Input
              id="email"
              placeholder="Enter email address"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  {getAccessLevelLabel(accessLevel)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={accessLevel}
                  onValueChange={(value) =>
                    setAccessLevel(value as AccessLevel)
                  }
                >
                  <DropdownMenuRadioItem value="view">
                    Can view
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="view-download">
                    Can view & download
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddCollaborator} className="shrink-0">
              <Plus className="w-4 h-4" />
              <span className="sr-only">Add</span>
            </Button>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div className="space-y-4 max-h-[240px] overflow-y-auto">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborator.avatarUrl} />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {collaborator.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {collaborator.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {collaborator.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          {getAccessLevelLabel(collaborator.accessLevel)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup
                          value={collaborator.accessLevel}
                          onValueChange={(value) =>
                            updateCollaboratorAccess(
                              collaborator.id,
                              value as AccessLevel
                            )
                          }
                        >
                          <DropdownMenuRadioItem value="view">
                            Can view
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="view-download">
                            Can view & download
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => removeCollaborator(collaborator.id)}
                        >
                          <Trash2 className="size-3.5 mr-0.5" />
                          <span>Delete Project</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
}
