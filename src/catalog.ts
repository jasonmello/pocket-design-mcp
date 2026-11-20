// Catálogo copiado de https://resources.cesaroeduardo.com/ em 2026-11-20.
// `access` diz como o agente chega no recurso:
//   tool:<nome>  → uma ferramenta deste MCP cobre
//   mcp          → existe MCP oficial; plugue o dele
//   link         → sem API grátis; o agente só indica o link

export type Pricing = "free" | "freemium" | "paid";

export interface Resource {
  name: string;
  category: string;
  pricing: Pricing;
  url: string;
  access: string;
}

const r = (category: string, name: string, pricing: Pricing, url: string, access = "link"): Resource => ({
  name,
  category,
  pricing,
  url,
  access,
});

export const CATALOG: Resource[] = [
  r("Web References", "60fps", "free", "https://60fps.design/"),
  r("Web References", "Inspora", "free", "https://www.inspora.design/"),
  r("Web References", "Mobbin", "paid", "https://mobbin.com/"),
  r("Web References", "Collect UI", "freemium", "https://collectui.com/"),
  r("Web References", "UI Land", "free", "https://uiland.design/explore"),
  r("Web References", "Awwwards", "freemium", "https://www.awwwards.com/"),

  r("Images", "Lummi", "freemium", "https://www.lummi.ai/"),
  r("Images", "MJ Pro", "paid", "https://mjpro.ai/"),
  r("Images", "Cosmos", "freemium", "https://www.cosmos.so/"),
  r("Images", "Imageory", "free", "https://www.imageory.in/gallery"),
  r("Images", "Pixabay", "free", "https://pixabay.com/photos/", "tool:search_images"),

  r("Components", "21st.dev", "freemium", "https://21st.dev/", "mcp"),
  r("Components", "shadcn/ui", "free", "https://ui.shadcn.com/", "tool:search_components, get_component"),
  r("Components", "HeroUI", "freemium", "https://www.heroui.com/"),
  r("Components", "Origin UI", "free", "https://originui.com/"),
  r("Components", "aMicro Loaders", "free", "https://amicro.dev/loaders"),
  r("Components", "TUFFUI", "free", "https://tuffui.com/components"),
  r("Components", "Libraries.dev", "freemium", "https://libraries.dev/"),

  r("Icons", "Phosphor Icons", "free", "https://phosphoricons.com/", "tool:search_icons, get_icon"),
  r("Icons", "Hugeicons", "freemium", "https://hugeicons.com/", "tool:search_icons, get_icon"),
  r("Icons", "Feather Icons", "free", "https://feathericons.com/", "tool:search_icons, get_icon"),
  r("Icons", "Pixelarticons", "freemium", "https://pixelarticons.com/", "tool:search_icons, get_icon"),

  r("Fonts", "Google Fonts", "free", "https://fonts.google.com/", "tool:search_fonts"),
  r("Fonts", "MyFonts", "paid", "https://www.myfonts.com/"),
  r("Fonts", "Plau", "paid", "https://plau.co/"),
  r("Fonts", "PintassilgoPrints", "paid", "https://pintassilgoprints.com/fonts/"),
  r("Fonts", "Fontshare", "free", "https://www.fontshare.com/", "tool:search_fonts"),

  r("Motion", "Motion In Design", "free", "https://motionin.design/"),
  r("Motion", "LottieFiles", "freemium", "https://lottiefiles.com/"),
  r("Motion", "Transitions.dev", "freemium", "https://transitions.dev/"),
  r("Motion", "GSAP", "free", "https://gsap.com/"),
  r("Motion", "Motion", "freemium", "https://motion.dev/"),
  r("Motion", "Metalforge", "freemium", "https://metalforge.xyz/"),

  r("Design Systems", "getdesign.md", "free", "https://getdesign.md/"),
  r("Design Systems", "components.design", "free", "https://components.design/"),
  r("Design Systems", "Design Systems Brasileiros", "free", "https://designsystemsbrasileiros.com/"),
  r("Design Systems", "Design Systems Directory", "free", "https://design.how/directory/design-systems"),

  r("Agent Skills", "Anti Web Slop", "free", "https://antiwebslop.cesaroeduardo.com/"),
  r("Agent Skills", "Revenue Centric Design", "free", "https://github.com/heliocosta-dev/revenue-centric-design/"),

  r("AI Tools", "Weave", "freemium", "https://weave.figma.com/"),
  r("AI Tools", "Grokbot", "freemium", "https://grok.com/"),
  r("AI Tools", "Cursor", "freemium", "https://cursor.com/"),
  r("AI Tools", "Agentes.chat", "freemium", "https://agentes.chat/"),

  r("Design Tools", "FigJam", "freemium", "https://www.figma.com/figjam/"),
  r("Design Tools", "Figma", "freemium", "https://www.figma.com/", "mcp"),
  r("Design Tools", "Elyx", "freemium", "https://elyx.design/"),

  r("3D Tools", "Spline", "freemium", "https://spline.design/"),
  r("3D Tools", "Blender", "free", "https://www.blender.org/"),
  r("3D Tools", "Three.js", "free", "https://threejs.org/"),
  r("3D Tools", "Tripo3D", "freemium", "https://studio.tripo3d.ai/"),

  r("Web Utility", "SVGOMG", "free", "https://jakearchibald.github.io/svgomg/", "tool:optimize_svg"),
  r("Web Utility", "OpenShaders", "free", "https://openshaders.com/"),
  r("Web Utility", "Coolors", "freemium", "https://coolors.co/", "tool:make_palette"),

  r("Video & Capture", "Screen Studio", "paid", "https://screen.studio/"),
  r("Video & Capture", "OpenScreen", "freemium", "https://getopenscreen.com/"),
  r("Video & Capture", "NVIDIA Broadcast", "free", "https://www.nvidia.com/en-us/geforce/broadcasting/broadcast-app/"),
  r("Video & Capture", "OBS Studio", "free", "https://obsproject.com/"),
  r("Video & Capture", "UltraMock", "freemium", "https://www.ultramock.io/"),
  r("Video & Capture", "DaVinci Resolve", "freemium", "https://www.blackmagicdesign.com/products/davinciresolve"),

  r("Infrastructure", "Hostinger", "paid", "https://www.hostinger.com/"),
  r("Infrastructure", "Vercel", "freemium", "https://vercel.com/", "mcp"),
  r("Infrastructure", "Supabase", "freemium", "https://supabase.com/", "mcp"),
  r("Infrastructure", "Sanity", "freemium", "https://www.sanity.io/", "mcp"),

  r("Audio", "ElevenLabs", "freemium", "https://elevenlabs.io/", "mcp"),
  r("Audio", "Pixabay Sound Effects", "free", "https://pixabay.com/sound-effects/"),

  r("Metrics", "Mixpanel", "freemium", "https://mixpanel.com/"),
  r("Metrics", "Himetrica", "freemium", "https://www.himetrica.com/"),
  r("Metrics", "PostHog", "freemium", "https://posthog.com/", "mcp"),

  r("Organization", "Notion", "freemium", "https://www.notion.com/", "mcp"),
  r("Organization", "Linear", "freemium", "https://linear.app/", "mcp"),
];
