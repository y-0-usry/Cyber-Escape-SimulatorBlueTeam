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
      const actionMatch = raw.match(/\b(ALLOW|DENY|ACCEPT|DROP)\b/i);

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'firewall',
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
  },

  dns: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      const dnsQuestion = (entry.dns && entry.dns.question && entry.dns.question.name) || 'unknown';
      const queryType = (entry.dns && entry.dns.question && entry.dns.question.type) || 'unknown';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'dns',
        'event.category': 'network',
        'event.type': 'dns',
        'event.action': 'dns_query',
        'dns.question.name': dnsQuestion,
        'dns.question.type': queryType,
        'dns.response_code': (entry.dns && entry.dns.response_code) || 'NOERROR',
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0',
        'destination.ip': entry.destination && entry.destination.ip ? entry.destination.ip : '0.0.0.0'
      };
    }
  },

  ids: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      const ruleName = (entry.rule && entry.rule.name) || 'Unknown Alert';
      const ruleId = (entry.rule && entry.rule.id) || '0';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'ids',
        'event.category': 'intrusion_detection',
        'event.type': 'alert',
        'event.action': 'alert',
        'rule.name': ruleName,
        'rule.id': ruleId,
        'severity': entry.severity || 0,
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0',
        'destination.ip': entry.destination && entry.destination.ip ? entry.destination.ip : '0.0.0.0'
      };
    }
  },

  ssh: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      let action = entry.event && entry.event.action ? entry.event.action : 'unknown';
      let outcome = 'unknown';
      
      if (/failed|invalid/i.test(raw)) outcome = 'failure';
      else if (/accepted|successful/i.test(raw)) outcome = 'success';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'host',
        'event.category': 'authentication',
        'event.type': 'ssh',
        'event.action': action,
        'event.outcome': outcome,
        'process.name': (entry.process && entry.process.name) || 'sshd',
        'process.pid': (entry.process && entry.process.pid) || 0,
        'user.name': entry.user && entry.user.name ? entry.user.name : 'unknown',
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0',
        'source.port': entry.source && entry.source.port ? entry.source.port : 0
      };
    }
  },

  web_server: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      const httpMethod = (entry.http && entry.http.method) || 'GET';
      const httpTarget = (entry.http && entry.http.target) || '/';
      const statusCode = (entry.http && entry.http.status_code) || 200;

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'web_server',
        'event.category': 'web',
        'event.type': 'http_request',
        'event.action': httpMethod.toLowerCase(),
        'http.method': httpMethod,
        'http.request.body.content': httpTarget,
        'http.response.status_code': statusCode,
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0',
        'user_agent.original': (entry.user_agent && entry.user_agent.original) || 'unknown'
      };
    }
  },

  database: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      const dbUser = (entry.database && entry.database.user) || 'unknown';
      const query = (entry.database && entry.database.query) || 'unknown';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'database',
        'event.category': 'database',
        'event.type': 'query',
        'event.action': query.includes('SELECT') ? 'read' : query.includes('INSERT') ? 'write' : 'modify',
        'database.user': dbUser,
        'database.query': query,
        'rows_affected': entry.rows_returned || 0
      };
    }
  },

  vpn: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'vpn',
        'event.category': 'network',
        'event.type': 'vpn',
        'event.action': (entry.event && entry.event.action) || 'vpn_event',
        'event.outcome': entry.event_outcome || 'unknown',
        'user.name': entry.user && entry.user.name ? entry.user.name : 'unknown',
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0'
      };
    }
  },

  proxy: {
    transform: (entry) => {
      const raw = entry['log.original'] || entry.raw || '';
      const httpMethod = (entry.http && entry.http.method) || 'CONNECT';
      const destDomain = (entry.destination && entry.destination.domain) || 'unknown';

      return {
        'log.original': raw,
        '@timestamp': entry['@timestamp'] ? new Date(entry['@timestamp']).toISOString() : new Date().toISOString(),
        'observer.type': 'proxy',
        'event.category': 'network',
        'event.type': 'proxy',
        'event.action': httpMethod.toLowerCase(),
        'http.method': httpMethod,
        'destination.domain': destDomain,
        'http.response.status_code': (entry.http && entry.http.status_code) || 0,
        'source.ip': entry.source && entry.source.ip ? entry.source.ip : '0.0.0.0',
        'bytes_transferred': entry.bytes_transferred || 0
      };
    }
  }
};
