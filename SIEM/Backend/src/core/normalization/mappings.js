module.exports = {
  firewall: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      if (!raw) {
        console.error('No raw log data in firewall entry:', entry);
        return { 'log.original': raw };
      }

      const protocolMatch = raw.match(/\b(TCP|UDP|ICMP)\b/i);
      const sourceMatch = raw.match(/(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/i);
      const destMatch = raw.match(/->\s*(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/i);
      const actionMatch = raw.match(/\b(ALLOW|DENY|ACCEPT|DROP)\b/i); // Expanded actions

      console.log('Firewall raw:', raw);
      console.log('Matches - Protocol:', protocolMatch, 'Source:', sourceMatch, 'Dest:', destMatch, 'Action:', actionMatch);

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'host',
        'event.category': 'network',
        'event.type': 'network_traffic',
        'event.action': actionMatch ? actionMatch[0].toLowerCase() : 'unknown',
        'network.protocol': protocolMatch ? protocolMatch[0].toUpperCase() : 'unknown',
        'source.ip': sourceMatch ? sourceMatch[1] : '0.0.0.0',
        'source.port': sourceMatch && sourceMatch[2] ? parseInt(sourceMatch[2], 10) : 0,
        'destination.ip': destMatch ? destMatch[1] : '0.0.0.0',
        'destination.port': destMatch && destMatch[2] ? parseInt(destMatch[2], 10) : 0
      };
    }
  },

  windows: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      if (!raw) {
        console.error('No raw log data in windows entry:', entry);
        return { 'log.original': raw };
      }

      const userMatch = raw.match(/User\s+"([^"]+)"|for\s+user\s+"([^"]+)"|User:\s*(\w+)/i);
      const ipMatch = raw.match(/from\s+(\d+\.\d+\.\d+\.\d+)/i);
      let action = null;
      let outcome = null;

      if (/logged\s+(in|on)|successful\s+login/i.test(raw)) {
        action = 'login';
        outcome = 'success';
      } else if (/failed\s+login|login\s+failed/i.test(raw)) {
        action = 'login';
        outcome = 'failure';
      } else if (/password\s+change/i.test(raw)) {
        action = 'password_change';
        outcome = 'warning';
      }

      console.log('Windows raw:', raw);
      console.log('Matches - User:', userMatch, 'IP:', ipMatch, 'Action:', action, 'Outcome:', outcome);

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'host',
        'event.category': 'authentication',
        'event.type': 'security',
        'event.action': action || 'unknown',
        'event.outcome': outcome || 'unknown',
        'user.name': userMatch ? (userMatch[1] || userMatch[2] || userMatch[3]) : 'unknown',
        'source.ip': ipMatch ? ipMatch[1] : '0.0.0.0'
      };
    }
  }
};