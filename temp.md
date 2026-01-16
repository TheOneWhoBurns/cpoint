
[ec2-user@ip-172-31-75-194 ~]$  cat /var/log/cloud-init-output.log
Cloud-init v. 22.2.2 running 'init' at Fri, 16 Jan 2026 22:11:28 +0000. Up 6.02 seconds.
ci-info: +++++++++++++++++++++++++++++++++++++++Net device info+++++++++++++++++++++++++++++++++++++++
ci-info: +--------+------+------------------------------+---------------+--------+-------------------+
ci-info: | Device |  Up  |           Address            |      Mask     | Scope  |     Hw-Address    |
ci-info: +--------+------+------------------------------+---------------+--------+-------------------+
ci-info: |  ens5  | True |        172.31.75.194         | 255.255.240.0 | global | 16:ff:d6:8a:12:f9 |
ci-info: |  ens5  | True | fe80::14ff:d6ff:fe8a:12f9/64 |       .       |  link  | 16:ff:d6:8a:12:f9 |
ci-info: |   lo   | True |          127.0.0.1           |   255.0.0.0   |  host  |         .         |
ci-info: |   lo   | True |           ::1/128            |       .       |  host  |         .         |
ci-info: +--------+------+------------------------------+---------------+--------+-------------------+
ci-info: ++++++++++++++++++++++++++++++Route IPv4 info++++++++++++++++++++++++++++++
ci-info: +-------+-------------+-------------+-----------------+-----------+-------+
ci-info: | Route | Destination |   Gateway   |     Genmask     | Interface | Flags |
ci-info: +-------+-------------+-------------+-----------------+-----------+-------+
ci-info: |   0   |   0.0.0.0   | 172.31.64.1 |     0.0.0.0     |    ens5   |   UG  |
ci-info: |   1   |  172.31.0.2 | 172.31.64.1 | 255.255.255.255 |    ens5   |  UGH  |
ci-info: |   2   | 172.31.64.0 |   0.0.0.0   |  255.255.240.0  |    ens5   |   U   |
ci-info: |   3   | 172.31.64.1 |   0.0.0.0   | 255.255.255.255 |    ens5   |   UH  |
ci-info: +-------+-------------+-------------+-----------------+-----------+-------+
ci-info: +++++++++++++++++++Route IPv6 info+++++++++++++++++++
ci-info: +-------+-------------+---------+-----------+-------+
ci-info: | Route | Destination | Gateway | Interface | Flags |
ci-info: +-------+-------------+---------+-----------+-------+
ci-info: |   0   |  fe80::/64  |    ::   |    ens5   |   U   |
ci-info: |   2   |    local    |    ::   |    ens5   |   U   |
ci-info: |   3   |  multicast  |    ::   |    ens5   |   U   |
ci-info: +-------+-------------+---------+-----------+-------+
Generating public/private ed25519 key pair.
Your identification has been saved in /etc/ssh/ssh_host_ed25519_key
Your public key has been saved in /etc/ssh/ssh_host_ed25519_key.pub
The key fingerprint is:
SHA256:9pzLIqATbG51WKyh9To0n+2/20bfftYu6CPUdCIxLXQ root@ip-172-31-75-194.ec2.internal
The key's randomart image is:
+--[ED25519 256]--+
|         ...E    |
|          +..    |
|     .     +     |
|    o o   . o .  |
| . o *  S  + o   |
|  = B o. o..o    |
| o = * o .+. o ..|
|  = o + o..o+ o =|
| . . . o.o**o. =+|
+----[SHA256]-----+
Generating public/private ecdsa key pair.
Your identification has been saved in /etc/ssh/ssh_host_ecdsa_key
Your public key has been saved in /etc/ssh/ssh_host_ecdsa_key.pub
The key fingerprint is:
SHA256:q0l+uZpyS7Ce+UwQuuAyywtOGjxmPgO3tDKYCJphY4Q root@ip-172-31-75-194.ec2.internal
The key's randomart image is:
+---[ECDSA 256]---+
|                 |
|                 |
|.   .            |
|E. . .           |
|o . o   S        |
|*=o. +   .       |
|&&oo. + ..       |
|^*+..O.+o        |
|oB+ ++X+..       |
+----[SHA256]-----+
Cloud-init v. 22.2.2 running 'modules:config' at Fri, 16 Jan 2026 22:11:29 +0000. Up 7.49 seconds.
Cloud-init v. 22.2.2 running 'modules:final' at Fri, 16 Jan 2026 22:11:30 +0000. Up 7.96 seconds.
Amazon Linux 2023 repository                     62 MB/s |  52 MB     00:00    
Amazon Linux 2023 Kernel Livepatch repository   241 kB/s |  30 kB     00:00    
Dependencies resolved.
Nothing to do.
Complete!
Last metadata expiration check: 0:00:02 ago on Fri Jan 16 22:11:44 2026.
Package docker-25.0.14-1.amzn2023.0.1.x86_64 is already installed.
Dependencies resolved.
======================================================================================
 Package                  Arch    Version                           Repository    Size
======================================================================================
Installing:
 git                      x86_64  2.50.1-1.amzn2023.0.1             amazonlinux   53 k
 nginx                    x86_64  1:1.28.0-1.amzn2023.0.2           amazonlinux   33 k

Transaction Summary
======================================================================================
Install  80 Packages

Total download size: 61 M
Installed size: 295 M
Downloading Packages:
(1/80): generic-logos-httpd-18.0.0-12.amzn2023. 529 kB/s |  19 kB     00:00    
(omited by user)
--------------------------------------------------------------------------------
Total                                            52 MB/s |  61 MB     00:01     
Running transaction check
Transaction check succeeded.
Running transaction test
Transaction test succeeded.
Running transaction
  Preparing        :                                                        1/1 
  Running scriptlet: nginx-filesystem-1:1.28.0-1.amzn2023.0.2.noarch       1/80 
  ... (omited by user)
  Verifying        : perl-vars-1.05-477.amzn2023.0.7.noarch               80/80 

Installed:
  generic-logos-httpd-18.0.0-12.amzn2023.0.3.noarch                          
  ....
  perl-vars-1.05-477.amzn2023.0.7.noarch                                        

Complete!
Created symlink /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service.
Cloning into 'rental-app'...
/var/lib/cloud/instance/scripts/part-001: line 20: docker-compose: command not found
2026-01-16 22:11:58,233 - cc_scripts_user.py[WARNING]: Failed to run module scripts-user (scripts in /var/lib/cloud/instance/scripts)
2026-01-16 22:11:58,236 - util.py[WARNING]: Running module scripts-user (<module 'cloudinit.config.cc_scripts_user' from '/usr/lib/python3.9/site-packages/cloudinit/config/cc_scripts_user.py'>) failed
Cloud-init v. 22.2.2 finished at Fri, 16 Jan 2026 22:11:58 +0000. Datasource DataSourceEc2.  Up 35.98 seconds
[ec2-user@ip-172-31-75-194 ~]$ 