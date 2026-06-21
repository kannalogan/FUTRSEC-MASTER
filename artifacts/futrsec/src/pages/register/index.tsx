import { useLocation } from "wouter";
import { Shield, GraduationCap, Building2, School } from "lucide-react";
import { motion } from "framer-motion";

const ROLES = [
  {
    id: "student",
    icon: GraduationCap,
    title: "Student",
    subtitle: "Cybersecurity student or graduate",
    desc: "Register for learning, assessments, mentorship and job placements.",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200 hover:border-blue-400",
    href: "/register/student",
  },
  {
    id: "tpo",
    icon: School,
    title: "Training & Placement Officer",
    subtitle: "College or Institution TPO",
    desc: "Manage student placements and track career outcomes for your institution.",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200 hover:border-purple-400",
    href: "/register/tpo",
  },
  {
    id: "employer",
    icon: Building2,
    title: "Hiring Company",
    subtitle: "Hire pre-assessed cybersecurity talent",
    desc: "Source verified candidates, manage interviews and hiring pipeline.",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    href: "/register/employer",
  },
];

export default function RegisterIndex() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground mb-3">
              Create your account
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose the role that best describes you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              return (
                <motion.button
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setLocation(role.href)}
                  className={`text-left p-6 rounded-xl border-2 transition-all duration-200 ${role.bg} focus:outline-none focus:ring-2 focus:ring-primary`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${role.bg.split(" ")[0]}`}>
                    <Icon className={`h-6 w-6 ${role.color}`} />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-base mb-1">{role.title}</h3>
                  <p className={`text-xs font-medium mb-2 ${role.color}`}>{role.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                </motion.button>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => setLocation("/login")} className="text-primary font-medium hover:underline">
              Sign in
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Mentor accounts are created by admins only. For mentor access, contact{" "}
            <a href="mailto:futrsec@bcbuzz.io" className="text-primary hover:underline">
              futrsec@bcbuzz.io
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
