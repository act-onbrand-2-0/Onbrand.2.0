import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestShadcnPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Shadcn UI Integration Test</h1>
          <p className="text-muted-foreground">Testing all installed components</p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge>Button</Badge>
            <Badge variant="secondary">Card</Badge>
            <Badge variant="outline">Badge</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>All available button styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button Sizes</CardTitle>
              <CardDescription>Different size options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🚀</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>Badge styles and colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>This card includes a footer with actions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards can be used to group related content and actions together.
                They support headers, content, and footers.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="border-2 border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Integration Test Successful</CardTitle>
            <CardDescription>
              All shadcn/ui components are working correctly in your Next.js application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                <span>Components are properly installed</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                <span>Tailwind CSS is configured correctly</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                <span>TypeScript types are working</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                <span>Path aliases (@/components) are resolved</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

