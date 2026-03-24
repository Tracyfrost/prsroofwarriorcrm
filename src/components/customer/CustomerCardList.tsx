// MOBILE-PORT: Maps to React Native FlatList with CustomerCard items
import { Phone, Mail, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface CustomerCardListProps {
  customers: any[];
  jobCounts: Record<string, number>;
  leadSources: any[];
}

export function CustomerCardList({ customers, jobCounts, leadSources }: CustomerCardListProps) {
  const navigate = useNavigate();

  const getPhones = (c: any): string[] => {
    const ci = c.contact_info as any;
    return (ci?.phones ?? []).map((p: any) => p.number).filter(Boolean);
  };
  const getEmails = (c: any): string[] => {
    const ci = c.contact_info as any;
    return (ci?.emails ?? []).map((e: any) => e.address).filter(Boolean);
  };

  if (customers.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No customers found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {customers.map((c: any) => {
        const phones = getPhones(c);
        const emails = getEmails(c);
        const addr = c.main_address as any;
        const leadSource = leadSources.find(ls => ls.name === c.lead_source);
        const nj = c.name_json as any;
        const spouse = nj?.spouse;

        return (
          <Card
            key={c.id}
            className="cursor-pointer hover:shadow-card-hover active:scale-[0.99] transition-all"
            onClick={() => navigate(`/customers/${c.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{c.name}</span>
                    {spouse?.first || spouse?.last ? (
                      <span className="text-xs text-muted-foreground">& {`${spouse.first || ""} ${spouse.last || ""}`.trim()}</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.customer_number || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {leadSource && (
                    <Badge style={{ backgroundColor: leadSource.color, color: '#fff' }} className="text-[10px]">
                      {leadSource.display_name}
                    </Badge>
                  )}
                  {jobCounts[c.id] ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <Briefcase className="h-3 w-3 mr-0.5" />{jobCounts[c.id]}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {phones[0] && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {phones[0]}
                  </span>
                )}
                {emails[0] && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <Mail className="h-3 w-3" /> {emails[0]}
                  </span>
                )}
                {addr?.city && (
                  <span>{addr.city}{addr.state ? `, ${addr.state}` : ""}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
