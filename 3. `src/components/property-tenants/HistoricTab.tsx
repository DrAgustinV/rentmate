      // Fetch tenant details (email, name)
      let tenantDetails: Record<string, { email: string; first_name: string | null; last_name: string | null }> = {};
      
      if (tenantIds.length > 0) {
        // ✅ Fixed: Changed 'tenants' to 'profiles' to match your Supabase schema
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', tenantIds);
        
        if (profiles) {
          profiles.forEach(p => {
            tenantDetails[p.id] = {
              email: p.email,
              first_name: p.first_name,
              last_name: p.last_name
            };
          });
        }
      }
// ... rest of the file remains unchanged ...
